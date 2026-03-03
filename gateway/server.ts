/**
 * OpenClaw Gateway Server
 * 独立的WebSocket守护进程，遵循OpenClaw官方架构
 * 
 * 运行方式：
 * - 开发: ts-node gateway/server.ts
 * - 生产: node dist/gateway/server.js
 * - 守护进程: pm2 start gateway/server.js --name openclaw-gateway
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IncomingMessage } from 'http';

// ==================== 类型定义 ====================

interface DeviceIdentity {
  version: number;
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  createdAtMs: number;
}

interface ClientConnection {
  ws: WebSocket;
  deviceId: string;
  role: 'client' | 'node';
  caps?: string[];
  commands?: string[];
  lastActivity: number;
}

interface GatewayConfig {
  port: number;
  host: string;
  token?: string;
  autoApproveLocal: boolean;
}

interface ProtocolMessage {
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

// ==================== Gateway核心 ====================

export class OpenClawGateway {
  private config: GatewayConfig;
  private wss: WebSocketServer | null = null;
  private httpServer: http.Server | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private devicePairings: Map<string, { approved: boolean; token?: string }> = new Map();
  private eventSeq = 0;
  private startTime = 0;

  // 存储路径
  private readonly STATE_DIR = process.env.OPENCLAW_STATE_DIR || path.join(process.env.HOME || '/tmp', '.openclaw');
  private readonly PAIRINGS_FILE: string;
  private readonly DEVICE_IDENTITY_FILE: string;

  constructor(config?: Partial<GatewayConfig>) {
    this.config = {
      port: config?.port || 18789,
      host: config?.host || '127.0.0.1',
      token: config?.token || process.env.OPENCLAW_GATEWAY_TOKEN,
      autoApproveLocal: config?.autoApproveLocal !== false
    };

    this.PAIRINGS_FILE = path.join(this.STATE_DIR, 'pairings.json');
    this.DEVICE_IDENTITY_FILE = path.join(this.STATE_DIR, 'device-identity.json');

    this.ensureStateDir();
    this.loadPairings();
  }

  // 确保状态目录存在
  private ensureStateDir(): void {
    if (!fs.existsSync(this.STATE_DIR)) {
      fs.mkdirSync(this.STATE_DIR, { recursive: true });
    }
  }

  // 加载设备配对
  private loadPairings(): void {
    try {
      if (fs.existsSync(this.PAIRINGS_FILE)) {
        const data = JSON.parse(fs.readFileSync(this.PAIRINGS_FILE, 'utf-8'));
        this.devicePairings = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load pairings:', error);
    }
  }

  // 保存设备配对
  private savePairings(): void {
    try {
      const data = Object.fromEntries(this.devicePairings);
      fs.writeFileSync(this.PAIRINGS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save pairings:', error);
    }
  }

  // 获取或创建设备身份
  private getOrCreateDeviceIdentity(): DeviceIdentity {
    try {
      if (fs.existsSync(this.DEVICE_IDENTITY_FILE)) {
        return JSON.parse(fs.readFileSync(this.DEVICE_IDENTITY_FILE, 'utf-8'));
      }
    } catch {
      // 继续创建新的
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const identity: DeviceIdentity = {
      version: 1,
      deviceId: crypto.randomBytes(16).toString('hex'),
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
      createdAtMs: Date.now()
    };

    fs.writeFileSync(this.DEVICE_IDENTITY_FILE, JSON.stringify(identity, null, 2));
    return identity;
  }

  // 启动Gateway
  start(): void {
    this.httpServer = http.createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`[Gateway] New connection from ${clientIp}`);

      const clientId = crypto.randomBytes(8).toString('hex');
      const connection: ClientConnection = {
        ws,
        deviceId: '',
        role: 'client',
        lastActivity: Date.now()
      };

      // 设置超时
      const handshakeTimeout = setTimeout(() => {
        if (!connection.deviceId) {
          console.log(`[Gateway] Handshake timeout for ${clientId}`);
          ws.close(1008, 'Handshake timeout');
        }
      }, 10000);

      ws.on('message', (data: RawData) => {
        try {
          const msg: ProtocolMessage = JSON.parse(data.toString());
          connection.lastActivity = Date.now();

          // 必须先发送connect
          if (!connection.deviceId && msg.type !== 'req' && msg.method !== 'connect') {
            ws.send(JSON.stringify({
              type: 'res',
              id: msg.id,
              ok: false,
              error: 'First message must be connect'
            }));
            ws.close(1008, 'Protocol violation');
            return;
          }

          this.handleMessage(connection, msg);
          
          if (msg.method === 'connect' && connection.deviceId) {
            clearTimeout(handshakeTimeout);
            this.clients.set(connection.deviceId, connection);
          }
        } catch (error) {
          console.error('[Gateway] Message parse error:', error);
          ws.close(1002, 'Invalid JSON');
        }
      });

      ws.on('close', () => {
        if (connection.deviceId) {
          this.clients.delete(connection.deviceId);
          console.log(`[Gateway] Client ${connection.deviceId} disconnected`);
          // 广播离线状态
          this.broadcastEvent('presence', {
            deviceId: connection.deviceId,
            online: false
          });
        }
      });

      ws.on('error', (error: Error) => {
        console.error('[Gateway] WebSocket error:', error);
      });
    });

    this.httpServer.listen(this.config.port, this.config.host, () => {
      this.startTime = Date.now();
      console.log(`[Gateway] Started on ${this.config.host}:${this.config.port}`);
      console.log(`[Gateway] Local connections auto-approve: ${this.config.autoApproveLocal}`);
    });
  }

  // 处理协议消息
  private handleMessage(conn: ClientConnection, msg: ProtocolMessage): void {
    switch (msg.method) {
      case 'connect':
        this.handleConnect(conn, msg);
        break;
      
      case 'health':
        this.handleHealth(conn, msg);
        break;
      
      case 'status':
        this.handleStatus(conn, msg);
        break;
      
      case 'agent':
        this.handleAgent(conn, msg);
        break;
      
      case 'send':
        this.handleSend(conn, msg);
        break;
      
      case 'config.get':
        this.handleConfigGet(conn, msg);
        break;
      
      case 'config.apply':
        this.handleConfigApply(conn, msg);
        break;
      
      default:
        conn.ws.send(JSON.stringify({
          type: 'res',
          id: msg.id,
          ok: false,
          error: `Unknown method: ${msg.method}`
        }));
    }
  }

  // 处理连接请求
  private handleConnect(conn: ClientConnection, msg: ProtocolMessage): void {
    const params = msg.params || {};
    const deviceId = params.deviceId;
    const role = params.role || 'client';
    const authToken = params.auth?.token;

    if (!deviceId) {
      conn.ws.send(JSON.stringify({
        type: 'res',
        id: msg.id,
        ok: false,
        error: 'deviceId required'
      }));
      conn.ws.close(1008, 'Missing deviceId');
      return;
    }

    // 检查Gateway Token
    if (this.config.token && authToken !== this.config.token) {
      conn.ws.send(JSON.stringify({
        type: 'res',
        id: msg.id,
        ok: false,
        error: 'Invalid gateway token'
      }));
      conn.ws.close(1008, 'Unauthorized');
      return;
    }

    // 检查设备配对
    const pairing = this.devicePairings.get(deviceId);
    const isLocal = this.isLocalConnection(conn);

    if (!pairing && this.config.autoApproveLocal && isLocal) {
      // 本地连接自动批准
      this.devicePairings.set(deviceId, { approved: true, token: crypto.randomBytes(32).toString('hex') });
      this.savePairings();
      console.log(`[Gateway] Auto-approved local device: ${deviceId}`);
    } else if (!pairing || !pairing.approved) {
      // 需要配对批准
      conn.ws.send(JSON.stringify({
        type: 'res',
        id: msg.id,
        ok: false,
        error: 'Device pairing required',
        payload: { pairingRequired: true, deviceId }
      }));
      
      // 广播配对请求
      this.broadcastEvent('pairing_request', { deviceId, role });
      return;
    }

    // 连接成功
    conn.deviceId = deviceId;
    conn.role = role;
    conn.caps = params.caps;
    conn.commands = params.commands;

    // 发送成功响应
    conn.ws.send(JSON.stringify({
      type: 'res',
      id: msg.id,
      ok: true,
      payload: {
        hello: 'ok',
        snapshot: {
          presence: this.getOnlinePresence(),
          health: this.getHealth()
        }
      }
    }));

    // 广播在线状态
    this.broadcastEvent('presence', {
      deviceId,
      role,
      online: true,
      caps: conn.caps,
      commands: conn.commands
    });

    console.log(`[Gateway] Device ${deviceId} connected (role: ${role})`);
  }

  // 健康检查
  private handleHealth(conn: ClientConnection, msg: ProtocolMessage): void {
    conn.ws.send(JSON.stringify({
      type: 'res',
      id: msg.id,
      ok: true,
      payload: this.getHealth()
    }));
  }

  // 状态查询
  private handleStatus(conn: ClientConnection, msg: ProtocolMessage): void {
    conn.ws.send(JSON.stringify({
      type: 'res',
      id: msg.id,
      ok: true,
      payload: {
        uptime: Date.now() - this.startTime,
        clients: this.clients.size,
        deviceId: conn.deviceId,
        role: conn.role
      }
    }));
  }

  // Agent调用
  private handleAgent(conn: ClientConnection, msg: ProtocolMessage): void {
    // 转发到Agent处理（这里应该调用实际的Agent）
    // 暂时返回模拟响应
    conn.ws.send(JSON.stringify({
      type: 'res',
      id: msg.id,
      ok: true,
      payload: {
        runId: crypto.randomBytes(8).toString('hex'),
        status: 'accepted'
      }
    }));

    // 模拟流式响应
    setTimeout(() => {
      conn.ws.send(JSON.stringify({
        type: 'event',
        event: 'agent',
        payload: {
          runId: msg.params?.runId,
          status: 'running',
          content: 'Processing...'
        }
      }));
    }, 100);

    setTimeout(() => {
      conn.ws.send(JSON.stringify({
        type: 'event',
        event: 'agent',
        payload: {
          runId: msg.params?.runId,
          status: 'complete'
        }
      }));
    }, 2000);
  }

  // 发送消息
  private handleSend(conn: ClientConnection, msg: ProtocolMessage): void {
    const { channel, to, content } = msg.params || {};
    
    // 这里应该调用实际的Channel发送
    console.log(`[Gateway] Send to ${channel}/${to}: ${content?.substring(0, 50)}...`);
    
    conn.ws.send(JSON.stringify({
      type: 'res',
      id: msg.id,
      ok: true,
      payload: { sent: true, channel, to }
    }));
  }

  // 获取配置
  private handleConfigGet(conn: ClientConnection, msg: ProtocolMessage): void {
    const configPath = path.join(this.STATE_DIR, 'openclaw.json');
    let config = {};
    
    try {
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch {
      // 忽略
    }

    conn.ws.send(JSON.stringify({
      type: 'res',
      id: msg.id,
      ok: true,
      payload: { config, hash: crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex') }
    }));
  }

  // 应用配置
  private handleConfigApply(conn: ClientConnection, msg: ProtocolMessage): void {
    const { raw } = msg.params || {};
    
    try {
      const config = JSON.parse(raw);
      const configPath = path.join(this.STATE_DIR, 'openclaw.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      conn.ws.send(JSON.stringify({
        type: 'res',
        id: msg.id,
        ok: true,
        payload: { message: 'Config saved, gateway will restart' }
      }));

      // 触发重启（在生产中应该优雅处理）
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    } catch (error) {
      conn.ws.send(JSON.stringify({
        type: 'res',
        id: msg.id,
        ok: false,
        error: 'Invalid config JSON'
      }));
    }
  }

  // 广播事件
  private broadcastEvent(event: string, payload: any): void {
    const msg: ProtocolMessage = {
      type: 'event',
      event,
      payload,
      seq: ++this.eventSeq
    };

    const data = JSON.stringify(msg);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  // 获取健康状态
  private getHealth(): any {
    return {
      status: 'ok',
      uptime: Date.now() - this.startTime,
      clients: this.clients.size,
      memory: process.memoryUsage()
    };
  }

  // 获取在线设备
  private getOnlinePresence(): any[] {
    return Array.from(this.clients.values()).map(c => ({
      deviceId: c.deviceId,
      role: c.role,
      caps: c.caps,
      commands: c.commands
    }));
  }

  // 判断是否本地连接
  private isLocalConnection(conn: ClientConnection): boolean {
    // 在实际实现中，检查WebSocket的远程地址
    return true; // 暂时总是返回true
  }

  // 停止Gateway
  stop(): void {
    if (this.wss) {
      for (const client of this.clients.values()) {
        client.ws.close(1001, 'Gateway shutting down');
      }
      this.wss.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
    console.log('[Gateway] Stopped');
  }
}

// ==================== 启动入口 ====================

if (require.main === module) {
  const gateway = new OpenClawGateway({
    port: parseInt(process.env.OPENCLAW_GATEWAY_PORT || '18789'),
    host: process.env.OPENCLAW_GATEWAY_HOST || '127.0.0.1',
    token: process.env.OPENCLAW_GATEWAY_TOKEN
  });

  gateway.start();

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n[Gateway] Shutting down...');
    gateway.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    gateway.stop();
    process.exit(0);
  });
}

export default OpenClawGateway;
