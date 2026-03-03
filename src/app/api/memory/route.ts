// OpenClaw Memory API - 记忆管理接口
import { NextRequest, NextResponse } from 'next/server';
import { memoryManager } from '@/lib/openclaw/memory';
import type { Memory } from '@/lib/openclaw/types';

// GET /api/memory - 获取记忆
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter is required for search' },
            { status: 400 }
          );
        }
        const searchResults = await memoryManager.search(query, limit);
        return NextResponse.json({
          success: true,
          results: searchResults
        });

      case 'today':
        const todayMemories = await memoryManager.getTodayMemories();
        return NextResponse.json({
          success: true,
          memories: todayMemories
        });

      case 'recent':
        const days = parseInt(searchParams.get('days') || '7');
        const recentMemories = await memoryManager.getRecentMemories(days);
        return NextResponse.json({
          success: true,
          memories: recentMemories
        });

      case 'long-term':
        const longTermMemories = await memoryManager.getLongTermMemories();
        return NextResponse.json({
          success: true,
          memories: longTermMemories
        });

      case 'context':
        const context = await memoryManager.buildContext(limit);
        return NextResponse.json({
          success: true,
          context
        });

      default:
        const allMemories = await memoryManager.search('', 100);
        return NextResponse.json({
          success: true,
          memories: allMemories.map(r => r.memory)
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get memories' },
      { status: 500 }
    );
  }
}

// POST /api/memory - 添加记忆
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, tags = [], type = 'daily' } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    let memory: Memory;
    if (type === 'long-term') {
      memory = await memoryManager.addLongTermMemory(content, tags);
    } else {
      memory = await memoryManager.addDailyMemory(content, tags);
    }

    return NextResponse.json({
      success: true,
      memory
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add memory' },
      { status: 500 }
    );
  }
}

// DELETE /api/memory - 删除记忆
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      );
    }

    const store = memoryManager['store'];
    await store.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Memory deleted'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
