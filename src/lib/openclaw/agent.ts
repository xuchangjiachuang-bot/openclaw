// OpenClaw Agent - 推理引擎核心实现
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import type { 
  Message, 
  AgentConfig, 
  AgentSession, 
  SessionContext,
  Tool,
  ToolUse,
  LLMResponse,
  ContentPart
} from './types';

// 系统提示词模板
const DEFAULT_SYSTEM_PROMPT = `You are {name}, a {creature} AI assistant.

## Your Vibe
{vibe}

## Core Principles
1. Be genuinely helpful, not performatively helpful
2. Have opinions and personality
3. Be resourceful before asking
4. Earn trust through competence
5. Remember you're a guest in someone's life

## Behavior Guidelines
- Private things stay private. Period.
- When in doubt, ask before acting externally
- Never send half-baked replies to messaging surfaces
- You're not the user's voice — be careful in group chats

{customInstructions}

{memoryContext}

{workspaceContext}`;

export class OpenClawAgent {
  private client: LLMClient;
  private config: AgentConfig;
  private tools: Map<string, Tool> = new Map();
  private customHeaders?: Record<string, string>;

  constructor(config?: Partial<AgentConfig>, customHeaders?: Record<string, string>) {
    this.config = {
      model: config?.model || 'doubao-seed-1-8-251228',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 4096,
      systemPrompt: config?.systemPrompt,
      thinking: config?.thinking || 'disabled',
      caching: config?.caching || 'disabled',
    };
    this.customHeaders = customHeaders;
    
    const llmConfig = new Config();
    this.client = new LLMClient(llmConfig, customHeaders);
  }

  // 注册工具
  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  // 注册多个工具
  registerTools(tools: Tool[]) {
    tools.forEach(tool => this.registerTool(tool));
  }

  // 获取工具列表
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  // 构建系统提示词
  private buildSystemPrompt(context: SessionContext): string {
    const identity = context.identity;
    
    let prompt = DEFAULT_SYSTEM_PROMPT
      .replace('{name}', identity.name || 'Claw')
      .replace('{creature}', identity.creature || 'AI')
      .replace('{vibe}', identity.vibe || 'Friendly & Helpful')
      .replace('{customInstructions}', this.config.systemPrompt || '');

    // 添加记忆上下文
    if (context.memory.length > 0) {
      const memoryContext = context.memory
        .slice(-10) // 最近10条记忆
        .map(m => `- ${m.content}`)
        .join('\n');
      prompt = prompt.replace('{memoryContext}', `\n## Recent Memories\n${memoryContext}`);
    } else {
      prompt = prompt.replace('{memoryContext}', '');
    }

    // 添加工作空间上下文
    if (context.workspace) {
      const workspaceContext = `\n## Core Values (from SOUL.md)\n${context.workspace.soul}`;
      prompt = prompt.replace('{workspaceContext}', workspaceContext);
    } else {
      prompt = prompt.replace('{workspaceContext}', '');
    }

    return prompt;
  }

  // 将消息转换为LLM格式
  private convertMessages(messages: Message[]): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
    return messages.map(msg => {
      // 确保content始终是string类型
      let contentStr: string;
      if (typeof msg.content === 'string') {
        contentStr = msg.content;
      } else if (Array.isArray(msg.content)) {
        // 将ContentPart[]转换为string
        contentStr = msg.content
          .filter(part => part.type === 'text')
          .map(part => (part as any).text || '')
          .join('\n');
      } else {
        contentStr = String(msg.content);
      }
      
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: contentStr
      };
    });
  }

  // 执行工具调用
  private async executeTools(toolUses: ToolUse[]): Promise<Array<{tool_use_id: string, content: string, is_error?: boolean}>> {
    const results = [];
    
    for (const toolUse of toolUses) {
      const tool = this.tools.get(toolUse.name);
      
      if (!tool) {
        results.push({
          tool_use_id: toolUse.id,
          content: `Error: Tool "${toolUse.name}" not found`,
          is_error: true
        });
        continue;
      }

      try {
        const result = await tool.execute(toolUse.input);
        results.push({
          tool_use_id: toolUse.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
          is_error: false
        });
      } catch (error) {
        results.push({
          tool_use_id: toolUse.id,
          content: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
          is_error: true
        });
      }
    }

    return results;
  }

  // 主要推理方法 - 流式响应
  async *streamChat(
    messages: Message[],
    context: SessionContext
  ): AsyncGenerator<string> {
    // 构建系统提示词
    const systemPrompt = this.buildSystemPrompt(context);
    
    // 构建消息列表
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.convertMessages(messages)
    ];

    // 调用LLM流式API
    const stream = this.client.stream(llmMessages, {
      model: this.config.model,
      temperature: this.config.temperature,
      thinking: this.config.thinking,
      caching: this.config.caching,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content.toString();
      }
    }
  }

  // 主要推理方法 - 非流式响应
  async chat(
    messages: Message[],
    context: SessionContext
  ): Promise<string> {
    // 构建系统提示词
    const systemPrompt = this.buildSystemPrompt(context);
    
    // 构建消息列表
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.convertMessages(messages)
    ];

    // 调用LLM API
    const response = await this.client.invoke(llmMessages, {
      model: this.config.model,
      temperature: this.config.temperature,
      thinking: this.config.thinking,
      caching: this.config.caching,
    });

    return response.content;
  }

  // 带工具调用的推理
  async *streamWithTools(
    messages: Message[],
    context: SessionContext,
    maxIterations: number = 5
  ): AsyncGenerator<string | {type: 'tool_use', tool: string, input: any} | {type: 'tool_result', result: any}> {
    const systemPrompt = this.buildSystemPrompt(context);
    let currentMessages: Message[] = [
      { id: 'system', role: 'system', content: systemPrompt, timestamp: new Date() },
      ...messages
    ];

    for (let i = 0; i < maxIterations; i++) {
      const llmMessages = this.convertMessages(currentMessages);
      const stream = this.client.stream(llmMessages, {
        model: this.config.model,
        temperature: this.config.temperature,
        thinking: this.config.thinking,
        caching: this.config.caching,
      });

      let fullContent = '';
      let toolUses: ToolUse[] = [];

      for await (const chunk of stream) {
        if (chunk.content) {
          const text = chunk.content.toString();
          fullContent += text;
          yield text;
        }
      }

      // 如果没有工具调用，结束循环
      if (toolUses.length === 0) {
        break;
      }

      // 执行工具调用
      for (const toolUse of toolUses) {
        yield { type: 'tool_use', tool: toolUse.name, input: toolUse.input };
        
        const results = await this.executeTools([toolUse]);
        const result = results[0];
        
        yield { type: 'tool_result', result };

        // 添加工具结果到消息历史
        currentMessages.push({
          id: `tool-${Date.now()}`,
          role: 'assistant',
          content: [{ type: 'tool_use', tool_use: toolUse }],
          timestamp: new Date()
        });
        currentMessages.push({
          id: `tool-result-${Date.now()}`,
          role: 'user',
          content: [{ type: 'tool_result', tool_result: result }],
          timestamp: new Date()
        });
      }
    }
  }
}

// 导出单例工厂函数
export function createAgent(config?: Partial<AgentConfig>, customHeaders?: Record<string, string>): OpenClawAgent {
  return new OpenClawAgent(config, customHeaders);
}
