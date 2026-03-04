// OpenClaw 配置管理系统
import fs from 'fs';
import path from 'path';

export interface AppConfig {
  // LLM配置
  llm: {
    provider: 'coze' | 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'qwen' | 'openai-codex';
    model: string;
    apiKey: string;
    baseUrl?: string;
    temperature: number;
    maxTokens: number;
    // Codex OAuth token (for openai-codex provider)
    codexToken?: string;
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
    maxFileSize: number; // MB
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

const CONFIG_KEY = 'openclaw_app_config';
const CONFIG_FILE = '/tmp/openclaw_config.json';

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

// 判断是否在服务端
const isServer = typeof window === 'undefined';

// 配置管理器
class ConfigManager {
  private config: AppConfig;
  private configPath: string;
  
  constructor() {
    this.configPath = CONFIG_FILE;
    this.config = this.load();
  }
  
  // 加载配置
  load(): AppConfig {
    try {
      if (isServer) {
        // 服务端：从文件读取
        if (fs.existsSync(this.configPath)) {
          const data = fs.readFileSync(this.configPath, 'utf-8');
          const saved = JSON.parse(data);
          return this.mergeConfig(defaultConfig, saved);
        }
      } else {
        // 客户端：从localStorage读取
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return this.mergeConfig(defaultConfig, parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
    
    return { ...defaultConfig };
  }
  
  // 深度合并配置
  private mergeConfig(defaults: any, saved: any): AppConfig {
    const result = { ...defaults };
    for (const key in saved) {
      if (saved[key] !== null && typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
        result[key] = this.mergeConfig(defaults[key] || {}, saved[key]);
      } else {
        result[key] = saved[key];
      }
    }
    return result as AppConfig;
  }
  
  // 保存配置
  save(config: Partial<AppConfig>): void {
    this.config = this.mergeConfig(this.config, config);
    
    try {
      if (isServer) {
        // 服务端：写入文件
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      } else {
        // 客户端：写入localStorage
        localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
      }
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }
  
  // 获取完整配置
  get(): AppConfig {
    return this.config;
  }
  
  // 获取LLM配置
  getLLMConfig() {
    return this.config.llm;
  }
  
  // 获取权限配置
  getPermissions() {
    return this.config.permissions;
  }
  
  // 获取聊天配置
  getChatConfig() {
    return this.config.chat;
  }
  
  // 获取API Key（优先从配置文件读取，其次从环境变量）
  getApiKey(): string {
    // 首先检查配置文件中的API Key
    if (this.config.llm.apiKey) {
      return this.config.llm.apiKey;
    }
    
    // 服务端尝试读取环境变量
    if (isServer) {
      const provider = this.config.llm.provider;
      const envKeyMap: Record<string, string | undefined> = {
        'coze': process.env.COZE_API_KEY,
        'openai': process.env.OPENAI_API_KEY,
        'anthropic': process.env.ANTHROPIC_API_KEY,
        'deepseek': process.env.DEEPSEEK_API_KEY,
        'kimi': process.env.KIMI_API_KEY,
        'qwen': process.env.QWEN_API_KEY,
        'openai-codex': process.env.OPENAI_CODEX_TOKEN
      };
      
      const envKey = envKeyMap[provider];
      if (envKey) return envKey;
    }
    
    return '';
  }
  
  // 更新LLM配置
  updateLLMConfig(llmConfig: Partial<AppConfig['llm']>): void {
    this.save({
      llm: { ...this.config.llm, ...llmConfig }
    });
  }
  
  // 更新权限配置
  updatePermissions(permissions: Partial<AppConfig['permissions']>): void {
    this.save({
      permissions: { ...this.config.permissions, ...permissions }
    });
  }
  
  // 更新聊天配置
  updateChatConfig(chat: Partial<AppConfig['chat']>): void {
    this.save({
      chat: { ...this.config.chat, ...chat }
    });
  }
  
  // 重置配置
  reset(): void {
    this.config = { ...defaultConfig };
    
    try {
      if (isServer) {
        if (fs.existsSync(this.configPath)) {
          fs.unlinkSync(this.configPath);
        }
      } else {
        localStorage.removeItem(CONFIG_KEY);
      }
    } catch (e) {
      console.error('Failed to reset config:', e);
    }
  }
  
  // 导出配置
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  // 导入配置
  import(json: string): boolean {
    try {
      const config = JSON.parse(json);
      this.save(config);
      return true;
    } catch (e) {
      console.error('Failed to import config:', e);
      return false;
    }
  }
}

// 导出单例
export const configManager = new ConfigManager();
