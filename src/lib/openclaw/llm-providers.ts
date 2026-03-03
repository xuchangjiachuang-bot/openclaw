// OpenClaw 多Provider LLM客户端工厂
// 支持：OpenAI、Anthropic、DeepSeek、Kimi、Coze、OpenAI-Codex

import type { Message, LLMConfig, ToolUse, SkillTool } from './types';

// Provider类型
export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'coze' | 'openai-codex';

// Provider配置
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: string[];
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

// Provider配置表
export const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  'openai': {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview'],
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true
  },
  'anthropic': {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true
  },
  'deepseek': {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true
  },
  'kimi': {
    name: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyEnv: 'KIMI_API_KEY',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true
  },
  'coze': {
    name: 'Coze (ByteDance)',
    baseUrl: 'https://api.coze.com/v1',
    apiKeyEnv: 'COZE_API_KEY',
    models: ['doubao-seed-1-6', 'doubao-pro-32k', 'doubao-lite-4k'],
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true
  },
  'openai-codex': {
    name: 'OpenAI Code (Codex Subscription)',
    baseUrl: 'https://codex.openai.com/v1', // Codex专用端点
    apiKeyEnv: 'OPENAI_CODEX_TOKEN', // OAuth token
    models: ['gpt-4o', 'gpt-4-turbo', 'o1', 'o1-mini'],
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true
  }
};

// 统一的LLM响应格式
export interface UnifiedLLMResponse {
  content: string;
  toolCalls?: ToolUse[];
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens';
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// 流式响应块
export interface StreamChunk {
  type: 'text' | 'tool_use' | 'error';
  content?: string;
  toolUse?: ToolUse;
  error?: string;
}

// ==================== OpenAI 客户端 ====================
class OpenAIClient {
  private apiKey: string;
  private baseUrl: string;
  private provider: LLMProvider;

  constructor(apiKey: string, baseUrl?: string, provider: LLMProvider = 'openai') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || PROVIDERS[provider].baseUrl;
    this.provider = provider;
  }

  async invoke(
    messages: Array<{role: string; content: string}>,
    config: LLMConfig,
    tools?: SkillTool[]
  ): Promise<UnifiedLLMResponse> {
    const body: any = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false
    };

    // 添加工具定义
    if (tools && tools.length > 0 && PROVIDERS[this.provider].supportsTools) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    const result: UnifiedLLMResponse = {
      content: choice.message.content || '',
      stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 
                  choice.finish_reason === 'length' ? 'max_tokens' : 'end_turn',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    };

    // 处理工具调用
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      result.toolCalls = choice.message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments)
      }));
    }

    return result;
  }

  async *stream(
    messages: Array<{role: string; content: string}>,
    config: LLMConfig,
    tools?: SkillTool[]
  ): AsyncGenerator<StreamChunk> {
    const body: any = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true
    };

    if (tools && tools.length > 0 && PROVIDERS[this.provider].supportsTools) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: 'error', error: `OpenAI API error: ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              yield { type: 'text', content: delta.content };
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) {
                  yield {
                    type: 'tool_use',
                    toolUse: {
                      id: tc.id,
                      name: tc.function.name,
                      input: JSON.parse(tc.function.arguments || '{}')
                    }
                  };
                }
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }
}

// ==================== Anthropic 客户端 ====================
class AnthropicClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || PROVIDERS.anthropic.baseUrl;
  }

  async invoke(
    messages: Array<{role: string; content: string}>,
    config: LLMConfig,
    tools?: SkillTool[]
  ): Promise<UnifiedLLMResponse> {
    // 转换消息格式
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    const body: any = {
      model: config.model,
      messages: otherMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      max_tokens: config.maxTokens || 4096
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    // 转换工具格式
    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    
    const result: UnifiedLLMResponse = {
      content: data.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join(''),
      stopReason: data.stop_reason === 'tool_use' ? 'tool_use' : 
                  data.stop_reason === 'max_tokens' ? 'max_tokens' : 'end_turn',
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0
      }
    };

    // 处理工具调用
    const toolUses = data.content.filter((c: any) => c.type === 'tool_use');
    if (toolUses.length > 0) {
      result.toolCalls = toolUses.map((tu: any) => ({
        id: tu.id,
        name: tu.name,
        input: tu.input
      }));
    }

    return result;
  }

  async *stream(
    messages: Array<{role: string; content: string}>,
    config: LLMConfig,
    tools?: SkillTool[]
  ): AsyncGenerator<StreamChunk> {
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    const body: any = {
      model: config.model,
      messages: otherMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      max_tokens: config.maxTokens || 4096,
      stream: true
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: 'error', error: `Anthropic API error: ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield { type: 'text', content: data.delta.text };
            }
            
            if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
              yield {
                type: 'tool_use',
                toolUse: {
                  id: data.content_block.id,
                  name: data.content_block.name,
                  input: {}
                }
              };
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }
}

// ==================== LLM客户端工厂 ====================
export class LLMClientFactory {
  // 创建客户端
  static createClient(
    provider: LLMProvider,
    apiKey: string,
    baseUrl?: string
  ): OpenAIClient | AnthropicClient {
    switch (provider) {
      case 'anthropic':
        return new AnthropicClient(apiKey, baseUrl);
      
      case 'openai':
      case 'deepseek':
      case 'kimi':
      case 'coze':
      case 'openai-codex':
      default:
        return new OpenAIClient(apiKey, baseUrl, provider);
    }
  }

  // 从配置创建
  static fromConfig(config: { provider: LLMProvider; apiKey: string; baseUrl?: string }) {
    return this.createClient(config.provider, config.apiKey, config.baseUrl);
  }

  // 获取Provider信息
  static getProviderInfo(provider: LLMProvider): ProviderConfig {
    return PROVIDERS[provider];
  }

  // 获取所有Provider列表
  static getAllProviders(): Record<LLMProvider, ProviderConfig> {
    return PROVIDERS;
  }

  // 检查API Key是否有效
  static async validateApiKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(provider, apiKey);
      // 发送一个最小请求验证
      const response = await fetch(`${PROVIDERS[provider].baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ==================== OpenAI Codex OAuth ====================
export class CodexOAuth {
  private static CLIENT_ID = 'openai-codex-cli'; // 实际CLIENT_ID需要从OpenAI获取
  private static REDIRECT_PORT = 8765;
  private static TOKEN_KEY = 'openclaw_codex_token';

  // 启动OAuth流程
  static async startOAuthFlow(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // 构建OAuth URL
      const redirectUri = `http://localhost:${this.REDIRECT_PORT}/callback`;
      const authUrl = new URL('https://auth.openai.com/authorize');
      authUrl.searchParams.set('client_id', this.CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'chat:write chat:read');

      // 在实际实现中，需要：
      // 1. 启动本地服务器监听回调
      // 2. 打开浏览器访问authUrl
      // 3. 等待回调获取code
      // 4. 用code交换token
      
      // 这里返回模拟结果，提示用户需要手动配置
      return {
        success: false,
        error: 'OAuth flow requires browser interaction. Please configure manually or use the CLI command: openclaw models auth login --provider openai-codex'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth failed'
      };
    }
  }

  // 保存Token
  static saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  // 获取Token
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return process.env.OPENAI_CODEX_TOKEN || null;
  }

  // 清除Token
  static clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  // 检查Token是否过期
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
}
