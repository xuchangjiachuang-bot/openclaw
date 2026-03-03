// OpenClaw Memory System - 记忆系统实现
import type { Memory, MemorySearchResult } from './types';

// 记忆存储接口
export interface MemoryStore {
  save(memory: Memory): Promise<void>;
  load(id: string): Promise<Memory | null>;
  search(query: string, limit?: number): Promise<MemorySearchResult[]>;
  getByDate(date: Date): Promise<Memory[]>;
  getByType(type: 'long-term' | 'daily'): Promise<Memory[]>;
  getAll(): Promise<Memory[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

// 基于localStorage的记忆存储实现
export class LocalMemoryStore implements MemoryStore {
  private readonly STORAGE_KEY = 'openclaw_memories';

  private loadAll(): Memory[] {
    if (typeof window === 'undefined') return [];
    
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    
    try {
      return JSON.parse(data).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch {
      return [];
    }
  }

  private saveAll(memories: Memory[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(memories));
  }

  async save(memory: Memory): Promise<void> {
    const memories = this.loadAll();
    const existingIndex = memories.findIndex(m => m.id === memory.id);
    
    if (existingIndex >= 0) {
      memories[existingIndex] = memory;
    } else {
      memories.push(memory);
    }
    
    this.saveAll(memories);
  }

  async load(id: string): Promise<Memory | null> {
    const memories = this.loadAll();
    return memories.find(m => m.id === id) || null;
  }

  async search(query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    const memories = this.loadAll();
    const queryLower = query.toLowerCase();
    
    const results = memories
      .filter(m => {
        const contentMatch = m.content.toLowerCase().includes(queryLower);
        const tagMatch = m.tags.some(t => t.toLowerCase().includes(queryLower));
        return contentMatch || tagMatch;
      })
      .map(memory => {
        // 简单的相关性评分
        let score = 0;
        const contentLower = memory.content.toLowerCase();
        
        // 完全匹配加分
        if (contentLower.includes(queryLower)) score += 0.5;
        
        // 标签匹配加分
        if (memory.tags.some(t => t.toLowerCase() === queryLower)) score += 0.3;
        
        // 时间衰减（越新的记忆权重越高）
        const daysSinceCreation = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 0.2 - daysSinceCreation * 0.01);
        
        return { memory, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return results;
  }

  async getByDate(date: Date): Promise<Memory[]> {
    const memories = this.loadAll();
    const targetDate = date.toISOString().split('T')[0];
    
    return memories.filter(m => 
      new Date(m.timestamp).toISOString().split('T')[0] === targetDate
    );
  }

  async getByType(type: 'long-term' | 'daily'): Promise<Memory[]> {
    const memories = this.loadAll();
    return memories.filter(m => m.type === type);
  }

  async getAll(): Promise<Memory[]> {
    return this.loadAll();
  }

  async delete(id: string): Promise<void> {
    const memories = this.loadAll();
    const filtered = memories.filter(m => m.id !== id);
    this.saveAll(filtered);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// 记忆管理器
export class MemoryManager {
  private store: MemoryStore;

  constructor(store?: MemoryStore) {
    this.store = store || new LocalMemoryStore();
  }

  // 添加长期记忆
  async addLongTermMemory(content: string, tags: string[] = []): Promise<Memory> {
    const memory: Memory = {
      id: `lt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      tags: ['long-term', ...tags],
      timestamp: new Date(),
      type: 'long-term'
    };
    
    await this.store.save(memory);
    return memory;
  }

  // 添加日记记忆
  async addDailyMemory(content: string, tags: string[] = []): Promise<Memory> {
    const memory: Memory = {
      id: `day-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      tags: ['daily', ...tags],
      timestamp: new Date(),
      type: 'daily'
    };
    
    await this.store.save(memory);
    return memory;
  }

  // 搜索相关记忆
  async search(query: string, limit?: number): Promise<MemorySearchResult[]> {
    return this.store.search(query, limit);
  }

  // 获取今日记忆
  async getTodayMemories(): Promise<Memory[]> {
    return this.store.getByDate(new Date());
  }

  // 获取最近记忆
  async getRecentMemories(days: number = 7): Promise<Memory[]> {
    const memories = await this.store.getAll();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return memories
      .filter(m => new Date(m.timestamp) >= cutoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 获取长期记忆
  async getLongTermMemories(): Promise<Memory[]> {
    return this.store.getByType('long-term');
  }

  // 构建记忆上下文（用于AI）
  async buildContext(maxMemories: number = 10): Promise<string> {
    const recentMemories = await this.getRecentMemories(7);
    const longTermMemories = await this.getLongTermMemories();
    
    const context: string[] = [];
    
    if (longTermMemories.length > 0) {
      context.push('## Long-term Memories');
      longTermMemories.slice(0, 5).forEach(m => {
        context.push(`- ${m.content}`);
      });
    }
    
    if (recentMemories.length > 0) {
      context.push('\n## Recent Memories');
      recentMemories.slice(0, maxMemories).forEach(m => {
        const date = new Date(m.timestamp).toLocaleDateString();
        context.push(`- [${date}] ${m.content}`);
      });
    }
    
    return context.join('\n');
  }

  // 清理过期记忆
  async cleanup(retentionDays: number = 90): Promise<number> {
    const memories = await this.store.getAll();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    
    let deleted = 0;
    for (const memory of memories) {
      if (memory.type === 'daily' && new Date(memory.timestamp) < cutoff) {
        await this.store.delete(memory.id);
        deleted++;
      }
    }
    
    return deleted;
  }

  // 导出记忆
  async export(): Promise<string> {
    const memories = await this.store.getAll();
    return JSON.stringify(memories, null, 2);
  }

  // 导入记忆
  async import(data: string): Promise<number> {
    const memories: Memory[] = JSON.parse(data);
    let imported = 0;
    
    for (const memory of memories) {
      await this.store.save({
        ...memory,
        timestamp: new Date(memory.timestamp)
      });
      imported++;
    }
    
    return imported;
  }
}

// 导出单例
export const memoryManager = new MemoryManager();
