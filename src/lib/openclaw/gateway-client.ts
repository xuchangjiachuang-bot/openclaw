/**
 * OpenClaw Gateway WebSocket客户端
 * 用于前端连接Gateway守护进程
 */

// ==================== 类型定义 ====================

export interface GatewayConfig {
  url: string;
  deviceId: string;
  token?: string;
  role?: 'client' | 'node';
  caps?: string[];
  commands?: string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface ProtocolMessage {
  type: 'req' | 'res' | 'event';
  id?: string;
  method?: string;
  params?: any;
  ok?: boolean;
  payload?: any;
  error?: string;
  event?: string;
  seq?: number;
}

export type MessageHandler = (msg: ProtocolMessage) => void;
export type EventHandler = (event: string, payload: any) => void;
export type ConnectionHandler = (connected: boolean) => void;

// ==================== Gateway客户端 ====================

export class GatewayClient {
  private ws: WebSocket | null = null;
  private config: Required<GatewayConfig>;
  private requestId = 0;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private reconnectAttempts = 0;
  private connected = false;
  private shouldReconnect = true;

  constructor(config: GatewayConfig) {
    this.config = {
      url: config.url || 'ws://127.0.0.1:18789',
      deviceId: config.deviceId || this.generateDeviceId(),
      token: config.token || '',
      role: config.role || 'client',
      caps: config.caps || ['chat'],
      commands: config.commands || [],
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10
    };
  }

  // 生成设备ID
  private generateDeviceId(): string {
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem('openclaw_device_id');
    if (stored) return stored;
    
    const id = 'web-' + Math.random().toString(36).substring(2, 10);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('openclaw_device_id', id);
    }
    return id;
  }

  // 连接Gateway
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.shouldReconnect = true;
      
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = async () => {
          console.log('[GatewayClient] WebSocket connected, sending connect...');
          
          try {
            // 发送connect消息
            const response = await this.request('connect', {
              deviceId: this.config.deviceId,
              role: this.config.role,
              caps: this.config.caps,
              commands: this.config.commands,
              auth: this.config.token ? { token: this.config.token } : undefined
            });

            if (response.ok) {
              this.connected = true;
              this.reconnectAttempts = 0;
              this.connectionHandlers.forEach(h => h(true));
              console.log('[GatewayClient] Connected to gateway');
              resolve();
            } else {
              throw new Error(response.error || 'Connection rejected');
            }
          } catch (error) {
            this.ws?.close();
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const msg: ProtocolMessage = JSON.parse(event.data);
            this.handleMessage(msg);
          } catch (error) {
            console.error('[GatewayClient] Failed to parse message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[GatewayClient] WebSocket closed:', event.code, event.reason);
          this.connected = false;
          this.connectionHandlers.forEach(h => h(false));
          
          // 清理pending requests
          for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
            this.pendingRequests.delete(id);
          }

          // 自动重连
          if (this.shouldReconnect && this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[GatewayClient] Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), this.config.reconnectInterval);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[GatewayClient] WebSocket error:', error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connected = false;
  }

  // 发送请求
  request<T = any>(method: string, params?: any, timeout = 30000): Promise<{ ok: boolean; payload?: T; error?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const id = `req-${++this.requestId}`;
      const msg: ProtocolMessage = {
        type: 'req',
        id,
        method,
        params
      };

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: (res) => {
          clearTimeout(timeoutHandle);
          resolve(res);
        },
        reject,
        timeout: timeoutHandle
      });

      this.ws.send(JSON.stringify(msg));
    });
  }

  // 处理消息
  private handleMessage(msg: ProtocolMessage): void {
    // 响应
    if (msg.type === 'res' && msg.id) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.ok) {
          pending.resolve({ ok: true, payload: msg.payload });
        } else {
          pending.resolve({ ok: false, error: msg.error });
        }
      }
      return;
    }

    // 事件
    if (msg.type === 'event' && msg.event) {
      const handlers = this.eventHandlers.get(msg.event);
      if (handlers) {
        handlers.forEach(h => h(msg.event!, msg.payload));
      }
      // 通配符处理
      const allHandlers = this.eventHandlers.get('*');
      if (allHandlers) {
        allHandlers.forEach(h => h(msg.event!, msg.payload));
      }
    }

    // 通用消息处理
    this.messageHandlers.forEach(h => h(msg));
  }

  // 订阅事件
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  // 订阅连接状态
  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // 订阅所有消息
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // 便捷方法
  async health(): Promise<any> {
    const res = await this.request('health');
    return res.payload;
  }

  async status(): Promise<any> {
    const res = await this.request('status');
    return res.payload;
  }

  async sendAgentMessage(message: string, conversationId?: string): Promise<any> {
    const res = await this.request('agent', {
      message,
      conversationId,
      stream: true
    });
    return res.payload;
  }

  async sendMessage(channel: string, to: string, content: string): Promise<any> {
    const res = await this.request('send', { channel, to, content });
    return res.payload;
  }

  async getConfig(): Promise<any> {
    const res = await this.request('config.get');
    return res.payload;
  }

  async applyConfig(config: any): Promise<any> {
    const res = await this.request('config.apply', { raw: JSON.stringify(config) });
    return res.payload;
  }

  // 状态
  isConnected(): boolean {
    return this.connected;
  }

  getDeviceId(): string {
    return this.config.deviceId;
  }
}

// ==================== React Hook ====================

import { useEffect, useState, useCallback, useRef } from 'react';

export interface UseGatewayOptions {
  url?: string;
  autoConnect?: boolean;
}

export function useGateway(options: UseGatewayOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<GatewayClient | null>(null);

  useEffect(() => {
    if (options.autoConnect !== false) {
      clientRef.current = new GatewayClient({
        url: options.url || 'ws://127.0.0.1:18789',
        deviceId: 'web-' + Math.random().toString(36).substring(2, 10)
      });

      const unsub = clientRef.current.onConnection(setConnected);
      
      clientRef.current.connect().catch(e => {
        setError(e.message);
      });

      return () => {
        unsub();
        clientRef.current?.disconnect();
      };
    }
  }, [options.url, options.autoConnect]);

  const connect = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new GatewayClient({
        url: options.url || 'ws://127.0.0.1:18789',
        deviceId: 'web-' + Math.random().toString(36).substring(2, 10)
      });
      clientRef.current.onConnection(setConnected);
    }
    return clientRef.current.connect();
  }, [options.url]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    client: clientRef.current,
    connected,
    error,
    connect,
    disconnect
  };
}

export default GatewayClient;
