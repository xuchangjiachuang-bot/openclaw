// OpenClaw Gateway - 网关系统实现
// OpenClaw使用18789端口作为默认Gateway端口

import type { GatewayConfig, GatewayMessage, GatewayResponse } from './types';

// 默认Gateway配置
export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  port: 18789,
  host: 'localhost',
  websocket: true,
  http: true
};

// Gateway状态
export interface GatewayStatus {
  running: boolean;
  port: number;
  uptime: number;
  connections: number;
  messagesProcessed: number;
  lastError?: string;
}

// Gateway消息处理器类型
export type MessageHandler = (message: GatewayMessage) => Promise<GatewayResponse>;

// Gateway类
export class Gateway {
  private config: GatewayConfig;
  private status: GatewayStatus;
  private handlers: Map<string, MessageHandler> = new Map();
  private startTime: number = 0;
  private connections: Set<any> = new Set();

  constructor(config?: Partial<GatewayConfig>) {
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
    this.status = {
      running: false,
      port: this.config.port,
      uptime: 0,
      connections: 0,
      messagesProcessed: 0
    };
  }

  // 注册消息处理器
  registerHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  // 移除消息处理器
  removeHandler(type: string): void {
    this.handlers.delete(type);
  }

  // 处理消息
  async handleMessage(message: GatewayMessage): Promise<GatewayResponse> {
    const handler = this.handlers.get(message.type);
    
    if (!handler) {
      return {
        success: false,
        error: `No handler for message type: ${message.type}`,
        timestamp: new Date()
      };
    }

    try {
      const response = await handler(message);
      this.status.messagesProcessed++;
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Handler error',
        timestamp: new Date()
      };
    }
  }

  // 获取状态
  getStatus(): GatewayStatus {
    return {
      ...this.status,
      uptime: this.status.running ? Date.now() - this.startTime : 0,
      connections: this.connections.size
    };
  }

  // 启动（在服务器端环境中）
  start(): void {
    this.status.running = true;
    this.startTime = Date.now();
    console.log(`Gateway started on port ${this.config.port}`);
  }

  // 停止
  stop(): void {
    this.status.running = false;
    this.connections.clear();
    console.log('Gateway stopped');
  }

  // 获取配置
  getConfig(): GatewayConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(config: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...config };
    this.status.port = this.config.port;
  }
}

// 导出单例
export const gateway = new Gateway();

// 初始化默认处理器
gateway.registerHandler('chat', async (message) => {
  // Chat消息由专门的chat API处理
  return {
    success: true,
    data: { type: 'chat', payload: message.payload },
    timestamp: new Date()
  };
});

gateway.registerHandler('heartbeat', async (message) => {
  // Heartbeat消息由heartbeat系统处理
  return {
    success: true,
    data: { type: 'heartbeat', status: 'acknowledged' },
    timestamp: new Date()
  };
});

gateway.registerHandler('action', async (message) => {
  // Action消息用于技能触发
  return {
    success: true,
    data: { type: 'action', status: 'executed' },
    timestamp: new Date()
  };
});

gateway.registerHandler('status', async (message) => {
  // Status消息用于获取网关状态
  return {
    success: true,
    data: gateway.getStatus(),
    timestamp: new Date()
  };
});
