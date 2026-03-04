/**
 * OpenClaw 消息队列系统
 * 异步消息处理、重试机制、优先级队列
 * 
 * 用于：
 * - Channel消息发送
 * - 技能异步执行
 * - Webhook处理
 * - 定时任务
 */

// ==================== 类型定义 ====================

export type QueuePriority = 'high' | 'normal' | 'low';

export interface QueueMessage<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: QueuePriority;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface QueueConfig {
  name: string;
  maxConcurrent: number;
  retryDelay: number;      // 重试延迟（毫秒）
  maxRetryDelay: number;   // 最大重试延迟
  deadLetterQueue: boolean; // 是否启用死信队列
}

export type MessageHandler<T = any> = (message: QueueMessage<T>) => Promise<void>;

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

// ==================== 内存队列实现 ====================

class InMemoryQueue<T = any> {
  private name: string;
  private pending: QueueMessage<T>[] = [];
  private processing: Map<string, QueueMessage<T>> = new Map();
  private completed: QueueMessage<T>[] = [];
  private failed: QueueMessage<T>[] = [];
  private handlers: Map<string, MessageHandler<T>> = new Map();
  private config: QueueConfig;
  private running = false;
  private processInterval?: NodeJS.Timeout;

  constructor(config: QueueConfig) {
    this.name = config.name;
    this.config = {
      ...config,
      maxConcurrent: config.maxConcurrent ?? 5,
      retryDelay: config.retryDelay ?? 1000,
      maxRetryDelay: config.maxRetryDelay ?? 60000,
      deadLetterQueue: config.deadLetterQueue ?? true
    };
  }

  // 添加消息
  async enqueue(type: string, payload: T, options?: {
    priority?: QueuePriority;
    delay?: number;
    maxAttempts?: number;
  }): Promise<string> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const message: QueueMessage<T> = {
      id,
      type,
      payload,
      priority: options?.priority || 'normal',
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: new Date(),
      scheduledAt: options?.delay ? new Date(Date.now() + options.delay) : undefined
    };

    // 按优先级插入
    const priorities: QueuePriority[] = ['high', 'normal', 'low'];
    const insertIndex = this.pending.findIndex(
      m => priorities.indexOf(m.priority) > priorities.indexOf(message.priority)
    );

    if (insertIndex === -1) {
      this.pending.push(message);
    } else {
      this.pending.splice(insertIndex, 0, message);
    }

    return id;
  }

  // 注册处理器
  on(type: string, handler: MessageHandler<T>): void {
    this.handlers.set(type, handler);
  }

  // 开始处理
  start(): void {
    if (this.running) return;
    this.running = true;
    this.processLoop();
  }

  // 停止处理
  stop(): void {
    this.running = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }

  // 处理循环
  private processLoop(): void {
    this.processInterval = setInterval(() => {
      this.processNext();
    }, 100);
  }

  // 处理下一条消息
  private async processNext(): Promise<void> {
    if (!this.running) return;
    if (this.processing.size >= this.config.maxConcurrent) return;

    // 获取下一条待处理消息
    const now = Date.now();
    const messageIndex = this.pending.findIndex(
      m => !m.scheduledAt || m.scheduledAt.getTime() <= now
    );

    if (messageIndex === -1) return;

    const message = this.pending.splice(messageIndex, 1)[0];
    message.startedAt = new Date();
    message.attempts++;
    this.processing.set(message.id, message);

    const handler = this.handlers.get(message.type);

    if (!handler) {
      this.handleError(message, `No handler for type: ${message.type}`);
      return;
    }

    try {
      await handler(message);
      this.handleSuccess(message);
    } catch (error) {
      this.handleError(message, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // 处理成功
  private handleSuccess(message: QueueMessage<T>): void {
    message.completedAt = new Date();
    this.processing.delete(message.id);
    this.completed.push(message);

    // 限制历史记录
    if (this.completed.length > 1000) {
      this.completed = this.completed.slice(-500);
    }
  }

  // 处理错误
  private handleError(message: QueueMessage<T>, error: string): void {
    message.error = error;
    this.processing.delete(message.id);

    if (message.attempts < message.maxAttempts) {
      // 重试
      const delay = Math.min(
        this.config.retryDelay * Math.pow(2, message.attempts - 1),
        this.config.maxRetryDelay
      );
      message.scheduledAt = new Date(Date.now() + delay);
      this.pending.push(message);
    } else {
      // 失败
      this.failed.push(message);

      if (this.config.deadLetterQueue) {
        console.error(`[Queue:${this.name}] Message ${message.id} failed after ${message.attempts} attempts:`, error);
      }
    }
  }

  // 获取消息状态
  getStatus(id: string): QueueMessage<T> | undefined {
    return this.pending.find(m => m.id === id) ||
           this.processing.get(id) ||
           this.completed.find(m => m.id === id) ||
           this.failed.find(m => m.id === id);
  }

  // 获取统计
  getStats(): QueueStats {
    return {
      pending: this.pending.length,
      processing: this.processing.size,
      completed: this.completed.length,
      failed: this.failed.length,
      total: this.pending.length + this.processing.size + this.completed.length + this.failed.length
    };
  }

  // 清空队列
  clear(): void {
    this.pending = [];
    this.processing.clear();
    this.completed = [];
    this.failed = [];
  }
}

// ==================== 队列管理器 ====================

export class QueueManager {
  private queues: Map<string, InMemoryQueue> = new Map();

  // 创建或获取队列
  getQueue<T = any>(name: string, config?: Partial<QueueConfig>): InMemoryQueue<T> {
    if (!this.queues.has(name)) {
      const queue = new InMemoryQueue<T>({
        name,
        maxConcurrent: config?.maxConcurrent || 5,
        retryDelay: config?.retryDelay || 1000,
        maxRetryDelay: config?.maxRetryDelay || 60000,
        deadLetterQueue: config?.deadLetterQueue ?? true
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name) as InMemoryQueue<T>;
  }

  // 启动所有队列
  startAll(): void {
    for (const queue of this.queues.values()) {
      queue.start();
    }
  }

  // 停止所有队列
  stopAll(): void {
    for (const queue of this.queues.values()) {
      queue.stop();
    }
  }

  // 获取所有队列统计
  getAllStats(): Record<string, QueueStats> {
    const stats: Record<string, QueueStats> = {};
    for (const [name, queue] of this.queues) {
      stats[name] = queue.getStats();
    }
    return stats;
  }
}

// ==================== 预定义队列 ====================

// 消息发送队列
export const messageQueue = new InMemoryQueue<{ channelId: string; message: any }>({
  name: 'messages',
  maxConcurrent: 10,
  retryDelay: 2000,
  maxRetryDelay: 300000, // 5分钟
  deadLetterQueue: true
});

// 技能执行队列
export const skillQueue = new InMemoryQueue<{ skillId: string; input: any }>({
  name: 'skills',
  maxConcurrent: 3,
  retryDelay: 5000,
  maxRetryDelay: 600000, // 10分钟
  deadLetterQueue: true
});

// Webhook队列
export const webhookQueue = new InMemoryQueue<{ url: string; payload: any }>({
  name: 'webhooks',
  maxConcurrent: 20,
  retryDelay: 1000,
  maxRetryDelay: 60000,
  deadLetterQueue: true
});

// 定时任务队列
export const cronQueue = new InMemoryQueue<{ task: string; schedule: string }>({
  name: 'cron',
  maxConcurrent: 1,
  retryDelay: 60000,
  maxRetryDelay: 3600000, // 1小时
  deadLetterQueue: false
});

// ==================== 导出 ====================

export const queueManager = new QueueManager();

// 注册默认处理器
messageQueue.on('send', async (msg) => {
  const { channelId, message } = msg.payload;
  // 实际发送逻辑在Channel系统中实现
  console.log(`[MessageQueue] Sending to ${channelId}:`, message);
});

webhookQueue.on('send', async (msg) => {
  const { url, payload } = msg.payload;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }
});

export default QueueManager;
