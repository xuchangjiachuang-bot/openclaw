// OpenClaw - 完整模块导出
// 深度1:1克隆OpenClaw开源项目

// 类型定义
export * from './types';

// 核心模块
export { OpenClawAgent, createAgent } from './agent';
export { MemoryManager, LocalMemoryStore, memoryManager } from './memory';
export { 
  SkillRegistry, 
  ClawHubClient, 
  SkillDependencyChecker,
  SkillTriggerEngine,
  skillManager,
  parseSkillMd,
  generateSkillMd,
  skillToTools,
  BUILTIN_SKILLS,
  SKILL_STORAGE_PRIORITIES
} from './skills';
export type { ClawHubSkill } from './skills';
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

// 版本信息
export const OPENCLAW_VERSION = '1.0.0';
export const OPENCLAW_GATEWAY_PORT = 18789;
