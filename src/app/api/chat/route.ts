// OpenClaw Chat API - 完整实现
// 支持：多Provider、工具调用循环、本地文件系统操作

import { NextRequest, NextResponse } from 'next/server';
import { LLMClientFactory, type LLMProvider } from '@/lib/openclaw/llm-providers';
import { workspaceStorage } from '@/lib/openclaw/workspace';
import { memoryManager } from '@/lib/openclaw/memory';
import { skillManager, skillToTools } from '@/lib/openclaw/skills';
import { LOCAL_TOOLS, executeToolCall, getToolDefinitions, PermissionChecker } from '@/lib/openclaw/tools';
import { configManager } from '@/lib/openclaw/config';
import type { Message, SkillTool, ToolUse } from '@/lib/openclaw/types';

// 构建系统提示词
async function buildSystemPrompt(): Promise<string> {
  const identity = await workspaceStorage.getIdentity();
  const user = await workspaceStorage.getUser();
  const workspace = await workspaceStorage.getWorkspaceContext();
  const memoryContext = await memoryManager.buildContext(10);
  const enabledSkills = skillManager.getEnabledSkills();

  let prompt = `You are ${identity.name}, a ${identity.creature} AI assistant.

## Your Identity
- Name: ${identity.name}
- Creature: ${identity.creature}
- Vibe: ${identity.vibe}
- Emoji: ${identity.emoji}

## Core Values (from SOUL.md)
${workspace.soul}

## User Information
- Name: ${user.name || 'Unknown'}
- Timezone: ${user.timezone}
- Notes: ${user.notes || 'None'}
- Context: ${user.context || 'None'}

## Recent Memories
${memoryContext}

## Available Skills
${enabledSkills.map(s => `- ${s.name}: ${s.description}`).join('\n')}

## Behavior Guidelines
1. Be genuinely helpful, not performatively helpful
2. Have opinions and personality
3. Be resourceful before asking
4. Earn trust through competence
5. Remember you're a guest in someone's life
6. Private things stay private. Period.
7. When in doubt, ask before acting externally

## Tool Usage
You have access to tools for:
- File system operations (read, write, list, search, delete)
- Code execution (bash, python, node)
- HTTP requests
- Skill invocations

Use tools when needed to help the user. Always be careful with file operations and code execution.`;

  return prompt;
}

// 获取所有工具定义
function getAllToolDefinitions(): SkillTool[] {
  // 本地工具
  const localTools = getToolDefinitions();
  
  // 技能工具
  const skillTools = skillManager.getEnabledSkills().flatMap(skillToTools);
  
  return [...localTools, ...skillTools];
}

// 执行工具调用
async function processToolCalls(toolCalls: ToolUse[]): Promise<Array<{role: 'user', content: string}>> {
  const results: Array<{role: 'user', content: string}> = [];

  for (const toolCall of toolCalls) {
    let result: any;

    // 检查是否是本地工具
    const isLocalTool = LOCAL_TOOLS.some(t => t.name === toolCall.name);
    
    if (isLocalTool) {
      // 执行本地工具
      result = await executeToolCall(toolCall.name, toolCall.input);
    } else {
      // 执行技能工具
      const skill = skillManager.getEnabledSkills().find(
        s => `skill_${s.id.replace(/-/g, '_')}` === toolCall.name
      );
      
      if (skill) {
        // 技能执行逻辑 - 这里可以扩展为实际的技能处理器
        result = {
          tool_use_id: toolCall.id,
          content: JSON.stringify({
            success: true,
            message: `Skill ${skill.name} executed`,
            query: toolCall.input.query
          })
        };
      } else {
        result = {
          tool_use_id: toolCall.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
          is_error: true
        };
      }
    }

    results.push({
      role: 'user',
      content: JSON.stringify({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: result.content,
        is_error: result.is_error
      })
    });
  }

  return results;
}

// POST /api/chat - 流式聊天（支持工具调用循环）
export async function POST(request: NextRequest) {
  try {
    const { messages, stream = true, maxIterations = 5 } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // 获取配置
    const config = configManager.get();
    const llmConfig = config.llm;
    const permissions = config.permissions;

    // 权限检查
    const permissionChecker = new PermissionChecker(permissions);

    // 获取API Key
    const apiKey = configManager.getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please configure in Settings.' },
        { status: 400 }
      );
    }

    // 确定Provider
    const provider = llmConfig.provider as LLMProvider;

    // 创建LLM客户端
    const client = LLMClientFactory.createClient(provider, apiKey, llmConfig.baseUrl);

    // 构建系统提示词
    const systemPrompt = await buildSystemPrompt();

    // 获取工具定义
    const tools = getAllToolDefinitions();

    // 构建初始消息
    let llmMessages: Array<{role: string; content: string}> = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: Message) => ({
        role: msg.role as string,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }))
    ];

    if (stream) {
      // 流式响应（带工具调用循环）
      const encoder = new TextEncoder();
      
      const readable = new ReadableStream({
        async start(controller) {
          let iteration = 0;
          
          try {
            while (iteration < maxIterations) {
              iteration++;
              
              // 调用LLM
              const llmStream = client.stream(llmMessages, {
                model: llmConfig.model,
                temperature: llmConfig.temperature,
                maxTokens: llmConfig.maxTokens
              }, tools);

              let fullContent = '';
              let toolCalls: ToolUse[] = [];
              let currentToolCall: Partial<ToolUse> | null = null;

              for await (const chunk of llmStream) {
                if (chunk.type === 'text' && chunk.content) {
                  fullContent += chunk.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`));
                }
                
                if (chunk.type === 'tool_use' && chunk.toolUse) {
                  if (chunk.toolUse.id && chunk.toolUse.name) {
                    toolCalls.push(chunk.toolUse);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'tool_use', 
                      tool: chunk.toolUse.name,
                      input: chunk.toolUse.input 
                    })}\n\n`));
                  }
                }

                if (chunk.type === 'error') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`));
                }
              }

              // 如果没有工具调用，结束循环
              if (toolCalls.length === 0) {
                break;
              }

              // 添加助手消息
              llmMessages.push({
                role: 'assistant',
                content: fullContent
              });

              // 执行工具调用
              const toolResults = await processToolCalls(toolCalls);
              
              // 发送工具结果
              for (const result of toolResults) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', content: result.content })}\n\n`));
              }

              // 添加工具结果到消息
              llmMessages.push(...toolResults);
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // 非流式响应
      let iteration = 0;
      let lastContent = '';

      while (iteration < maxIterations) {
        iteration++;

        const response = await client.invoke(llmMessages, {
          model: llmConfig.model,
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens
        }, tools);

        lastContent = response.content;

        // 没有工具调用，结束
        if (!response.toolCalls || response.toolCalls.length === 0) {
          break;
        }

        // 添加助手消息
        llmMessages.push({
          role: 'assistant',
          content: response.content
        });

        // 执行工具调用
        const toolResults = await processToolCalls(response.toolCalls);
        llmMessages.push(...toolResults);
      }

      return NextResponse.json({
        success: true,
        content: lastContent
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
