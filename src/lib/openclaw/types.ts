// OpenClaw Core Types - 深度1:1实现

// ==================== Identity Types ====================
export interface Identity {
  name: string;
  creature: string;
  vibe: string;
  emoji: string;
  avatar: string;
}

// ==================== User Types ====================
export interface User {
  name: string;
  whatToCallThem: string;
  pronouns?: string;
  timezone: string;
  notes: string;
  context: string;
}

// ==================== Memory Types ====================
export interface Memory {
  id: string;
  content: string;
  tags: string[];
  timestamp: Date;
  type: 'long-term' | 'daily';
  metadata?: Record<string, any>;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  highlights?: string[];
}

// ==================== Message Types ====================
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
  timestamp: Date;
  sessionId?: string;
  channelId?: string;
  metadata?: MessageMetadata;
}

export interface ContentPart {
  type: 'text' | 'image_url' | 'video_url' | 'tool_use' | 'tool_result';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'high' | 'low';
  };
  video_url?: {
    url: string;
    fps?: number | null;
  };
  tool_use?: ToolUse;
  tool_result?: ToolResult;
}

export interface MessageMetadata {
  platform?: 'webchat' | 'whatsapp' | 'telegram' | 'discord' | 'slack';
  userId?: string;
  userName?: string;
  replyTo?: string;
}

// ==================== Tool Types ====================
export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// OpenClaw Skill Tool格式（用于LLM调用）
export interface SkillTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// 传统Tool格式（用于执行）
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (input: Record<string, any>) => Promise<any>;
}

// ==================== Agent Types ====================
export interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  thinking?: 'enabled' | 'disabled';
  caching?: 'enabled' | 'disabled';
}

export interface AgentSession {
  id: string;
  messages: Message[];
  context: SessionContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionContext {
  identity: Identity;
  user: User;
  memory: Memory[];
  workspace: WorkspaceContext;
}

export interface WorkspaceContext {
  soul: string;
  agents: string;
  tools: string;
  heartbeat: string;
}

// ==================== Skill Types ====================
export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  enabled: boolean;
  skillMd?: string; // SKILL.md content
  tools?: Tool[];
  triggers?: SkillTrigger[];
  metadata?: SkillMetadata;
}

export interface SkillTrigger {
  type: 'keyword' | 'regex' | 'intent' | 'webhook' | 'cron';
  pattern: string;
  priority?: number;
}

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags?: string[];
  dependencies?: string[];
  config?: SkillConfig[];
  openclaw?: {
    emoji?: string;
    os?: string[];
    primaryEnv?: string;
    requires?: {
      bins?: string[];
      env?: string[];
      config?: string[];
    };
    install?: Array<{
      id: string;
      kind: string;
      formula?: string;
    }>;
  };
}

export interface SkillConfig {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  default?: any;
  options?: string[];
  description: string;
}

// ==================== Channel Types ====================
export type ChannelType = 'webchat' | 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'imessage';

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: Date;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: Date;
  platform: ChannelType;
  metadata?: Record<string, any>;
}

// ==================== Heartbeat Types ====================
export interface HeartbeatTask {
  id: string;
  name: string;
  description: string;
  interval: number; // minutes
  enabled: boolean;
  lastCheck?: Date;
  nextCheck?: Date;
  status: 'pending' | 'running' | 'success' | 'error';
  lastError?: string;
  actions: HeartbeatAction[];
}

export interface HeartbeatAction {
  type: 'check_email' | 'check_calendar' | 'check_weather' | 'check_rss' | 'custom';
  config: Record<string, any>;
  onTrigger?: string;
}

export interface HeartbeatResult {
  taskId: string;
  timestamp: Date;
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

// ==================== Cron Types ====================
export interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  action: string;
  params?: Record<string, any>;
}

// ==================== Canvas Types ====================
export interface CanvasAction {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  context: Record<string, any>;
}

export interface CanvasComponent {
  id: string;
  type: 'button' | 'text' | 'image' | 'chart' | 'list' | 'card' | 'container' | 'form' | 'custom';
  props: Record<string, any>;
  children?: CanvasComponent[];
}

// ==================== Gateway Types ====================
export interface GatewayConfig {
  port: number;
  host: string;
  websocket: boolean;
  http: boolean;
}

export interface GatewayMessage {
  type: 'chat' | 'heartbeat' | 'action' | 'status' | 'error';
  payload: any;
  timestamp: Date;
  sessionId?: string;
}

export interface GatewayResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

// ==================== Device Identity ====================
export interface DeviceIdentity {
  version: number;
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  createdAtMs: number;
}

// ==================== Workspace State ====================
export interface WorkspaceState {
  version: number;
  bootstrapSeededAt?: string;
  lastSessionAt?: string;
  initializedAt?: string;
}

// ==================== LLM Integration ====================
export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  thinking?: 'enabled' | 'disabled';
  caching?: 'enabled' | 'disabled';
  streaming?: boolean;
}

export interface LLMResponse {
  content: string;
  toolUse?: ToolUse[];
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ==================== API Response Types ====================
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== File System Types ====================
export interface WorkspaceFile {
  path: string;
  content: string;
  lastModified: Date;
  size: number;
}

export type WorkspaceFileType = 
  | 'IDENTITY.md'
  | 'USER.md'
  | 'SOUL.md'
  | 'AGENTS.md'
  | 'TOOLS.md'
  | 'HEARTBEAT.md'
  | 'BOOTSTRAP.md'
  | 'MEMORY.md'
  | 'SKILL.md';

// ==================== App Configuration ====================
export interface AppConfig {
  // LLM配置
  llm: {
    provider: 'coze' | 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'qwen' | 'openai-codex';
    model: string;
    apiKey: string;
    baseUrl?: string;
    temperature: number;
    maxTokens: number;
    codexToken?: string; // For OpenAI Codex OAuth
  };
  
  // Gateway配置
  gateway: {
    port: number;
    host: string;
  };
  
  // 权限配置
  permissions: {
    allowFileSystem: boolean;
    allowNetwork: boolean;
    allowExecuteCode: boolean;
    allowedDomains: string[];
    sandboxMode: boolean;
  };
  
  // 聊天软件配置
  chat: {
    enableMarkdown: boolean;
    enableCodeHighlight: boolean;
    enableVoiceInput: boolean;
    enableFileUpload: boolean;
    maxFileSize: number;
    autoSaveHistory: boolean;
    historyLimit: number;
  };
  
  // 记忆配置
  memory: {
    enableLongTerm: boolean;
    enableDiary: boolean;
    maxMemories: number;
    importanceThreshold: number;
  };
}

// 默认配置
export const defaultConfig: AppConfig = {
  llm: {
    provider: 'coze',
    model: 'doubao-seed-1-6',
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 4096
  },
  gateway: {
    port: 18789,
    host: 'localhost'
  },
  permissions: {
    allowFileSystem: true,
    allowNetwork: true,
    allowExecuteCode: false,
    allowedDomains: ['*'],
    sandboxMode: true
  },
  chat: {
    enableMarkdown: true,
    enableCodeHighlight: true,
    enableVoiceInput: false,
    enableFileUpload: true,
    maxFileSize: 10,
    autoSaveHistory: true,
    historyLimit: 1000
  },
  memory: {
    enableLongTerm: true,
    enableDiary: true,
    maxMemories: 10000,
    importanceThreshold: 3
  }
};
