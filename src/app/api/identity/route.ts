// OpenClaw Identity API - 身份管理接口
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import type { Identity } from '@/lib/openclaw/types';

const IDENTITY_FILE = '/tmp/openclaw_identity.json';
const STATE_FILE = '/tmp/openclaw_state.json';

// 默认身份配置
const DEFAULT_IDENTITY: Identity = {
  name: 'Claw',
  creature: 'AI Assistant',
  vibe: 'Friendly & Helpful',
  emoji: '🦞',
  avatar: ''
};

// 读取身份
function getIdentity(): Identity {
  try {
    if (fs.existsSync(IDENTITY_FILE)) {
      const data = fs.readFileSync(IDENTITY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read identity:', e);
  }
  return { ...DEFAULT_IDENTITY };
}

// 保存身份
function saveIdentity(identity: Identity): void {
  try {
    fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2));
  } catch (e) {
    console.error('Failed to save identity:', e);
  }
}

// 检查是否已初始化
function isInitialized(): boolean {
  const identity = getIdentity();
  return identity.name !== DEFAULT_IDENTITY.name || 
         identity.creature !== DEFAULT_IDENTITY.creature;
}

// 读取状态
function getState(): any {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read state:', e);
  }
  return {};
}

// 保存状态
function saveState(state: any): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// GET /api/identity - 获取身份
export async function GET() {
  try {
    const identity = getIdentity();
    const initialized = isInitialized();

    return NextResponse.json({
      success: true,
      identity,
      isInitialized: initialized
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
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

    saveIdentity(identity);

    // 更新状态
    const state = getState();
    state.bootstrapSeededAt = new Date().toISOString();
    state.initializedAt = new Date().toISOString();
    saveState(state);

    return NextResponse.json({
      success: true,
      identity,
      isInitialized: true
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save identity' },
      { status: 500 }
    );
  }
}

// DELETE /api/identity - 重置身份
export async function DELETE() {
  try {
    if (fs.existsSync(IDENTITY_FILE)) {
      fs.unlinkSync(IDENTITY_FILE);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Identity reset'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset identity' },
      { status: 500 }
    );
  }
}
