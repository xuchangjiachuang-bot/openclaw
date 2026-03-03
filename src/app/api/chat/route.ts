// OpenClaw Chat API - 流式聊天接口
import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { workspaceStorage } from '@/lib/openclaw/workspace';
import { memoryManager } from '@/lib/openclaw/memory';
import { skillManager } from '@/lib/openclaw/skills';
import type { Message, SessionContext } from '@/lib/openclaw/types';

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

You respond naturally and conversationally, adapting to the user's style and needs.`;

  return prompt;
}

// POST /api/chat - 流式聊天
export async function POST(request: NextRequest) {
  try {
    const { messages, stream = true } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // 构建系统提示词
    const systemPrompt = await buildSystemPrompt();

    // 构建LLM消息
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }))
    ];

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    if (stream) {
      // 流式响应
      const encoder = new TextEncoder();
      const stream = client.stream(llmMessages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.7,
        caching: 'enabled'
      });

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.content) {
                const text = chunk.content.toString();
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
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
      const response = await client.invoke(llmMessages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.7
      });

      return NextResponse.json({
        success: true,
        content: response.content
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
