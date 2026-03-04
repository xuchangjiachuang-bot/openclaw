// OpenClaw - 完整模块导出
// 深度1:1克隆OpenClaw开源项目

// 类型定义
export * from './types';

// 核心模块
export { OpenClawAgent, createAgent } from './agent';
export { MemoryManager, LocalMemoryStore, memoryManager } from './memory';
export { 
  SkillRegistry, 
  SkillDependencyChecker,
  SkillTriggerEngine,
  skillManager,
  parseSkillMd,
  generateSkillMd,
  skillToTools,
  BUILTIN_SKILLS,
  SKILL_STORAGE_PRIORITIES
} from './skills';
// 注意: ClawHubClient和ClawHubSkill现在从./clawhub导入，不再从./skills导入
export { Gateway, gateway, DEFAULT_GATEWAY_CONFIG } from './gateway';
export type { GatewayStatus, MessageHandler } from './gateway';
export { ChannelManager, channelManager, CHANNEL_TEMPLATES } from './channel';
export { CanvasManager, canvasManager, COMPONENT_TEMPLATES } from './canvas';
export type { CanvasSurface, ComponentType } from './canvas';
export { WorkspaceStorage, workspaceStorage } from './workspace';
export { configManager } from './config';
export type { AppConfig } from './config';

// LLM Providers
export { 
  LLMClientFactory, 
  CodexOAuth,
  PROVIDERS
} from './llm-providers';
export type { LLMProvider, ProviderConfig, StreamChunk, UnifiedLLMResponse } from './llm-providers';

// 本地工具
export { 
  LOCAL_TOOLS, 
  PermissionChecker,
  fileReadTool,
  fileWriteTool,
  dirListTool,
  fileDeleteTool,
  fileSearchTool,
  codeExecuteTool,
  httpRequestTool,
  getToolDefinitions,
  executeToolCall
} from './tools';

// Gateway客户端
export { GatewayClient, useGateway } from './gateway-client';
export type { 
  GatewayConfig, 
  ProtocolMessage, 
  MessageHandler as WsMessageHandler,
  EventHandler,
  ConnectionHandler,
  UseGatewayOptions
} from './gateway-client';

// 代码沙箱
export { 
  CodeSandbox, 
  getSandbox, 
  executePython, 
  executeJavaScript, 
  executeBash,
  extractCodeBlocks 
} from './sandbox';
export type { 
  SandboxConfig, 
  ExecutionResult, 
  CodeBlock 
} from './sandbox';

// ClawHub技能市场
export { ClawHubClient, clawHubClient } from './clawhub';
export type {
  ClawHubSkill,
  ClawHubSearchResult,
  ClawHubCategory,
  InstallProgress
} from './clawhub';

// 消息队列
export { 
  QueueManager, 
  queueManager,
  messageQueue,
  skillQueue,
  webhookQueue,
  cronQueue
} from './queue';
export type {
  QueueMessage,
  QueuePriority,
  QueueConfig,
  QueueStats,
  MessageHandler as QueueMessageHandler
} from './queue';

// 版本信息
export const OPENCLAW_VERSION = '1.0.0';
export const OPENCLAW_GATEWAY_PORT = 18789;
