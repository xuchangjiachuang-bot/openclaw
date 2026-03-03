// OpenClaw Identity API - 身份管理接口
import { NextRequest, NextResponse } from 'next/server';
import { workspaceStorage } from '@/lib/openclaw/workspace';
import type { Identity } from '@/lib/openclaw/types';

// GET /api/identity - 获取身份
export async function GET() {
  try {
    const identity = await workspaceStorage.getIdentity();
    const isInitialized = await workspaceStorage.isInitialized();

    return NextResponse.json({
      success: true,
      identity,
      isInitialized
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get identity' },
      { status: 500 }
    );
  }
}

// POST /api/identity - 保存身份
export async function POST(request: NextRequest) {
  try {
    const identity: Identity = await request.json();

    // 验证必填字段
    if (!identity.name || !identity.creature) {
      return NextResponse.json(
        { error: 'Name and creature are required' },
        { status: 400 }
      );
    }

    await workspaceStorage.saveIdentity(identity);

    // 更新状态
    const state = await workspaceStorage.getState();
    state.bootstrapSeededAt = new Date().toISOString();
    await workspaceStorage.saveState(state);

    return NextResponse.json({
      success: true,
      identity
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save identity' },
      { status: 500 }
    );
  }
}

// PUT /api/identity - 更新身份
export async function PUT(request: NextRequest) {
  try {
    const updates: Partial<Identity> = await request.json();
    const current = await workspaceStorage.getIdentity();
    
    const updated: Identity = {
      ...current,
      ...updates
    };

    await workspaceStorage.saveIdentity(updated);

    return NextResponse.json({
      success: true,
      identity: updated
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update identity' },
      { status: 500 }
    );
  }
}
