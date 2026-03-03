// OpenClaw Workspace API - 工作空间管理接口
import { NextRequest, NextResponse } from 'next/server';
import { workspaceStorage } from '@/lib/openclaw/workspace';

// GET /api/workspace - 获取工作空间内容
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    switch (file) {
      case 'identity':
        const identity = await workspaceStorage.getIdentity();
        return NextResponse.json({ success: true, content: identity });

      case 'user':
        const user = await workspaceStorage.getUser();
        return NextResponse.json({ success: true, content: user });

      case 'soul':
        const soul = await workspaceStorage.getSoulMd();
        return NextResponse.json({ success: true, content: soul });

      case 'agents':
        const agents = await workspaceStorage.getAgentsMd();
        return NextResponse.json({ success: true, content: agents });

      case 'tools':
        const tools = await workspaceStorage.getToolsMd();
        return NextResponse.json({ success: true, content: tools });

      case 'heartbeat':
        const heartbeat = await workspaceStorage.getHeartbeatMd();
        return NextResponse.json({ success: true, content: heartbeat });

      case 'state':
        const state = await workspaceStorage.getState();
        return NextResponse.json({ success: true, content: state });

      case 'all':
        const context = await workspaceStorage.getWorkspaceContext();
        const identityAll = await workspaceStorage.getIdentity();
        const userAll = await workspaceStorage.getUser();
        const stateAll = await workspaceStorage.getState();
        
        return NextResponse.json({
          success: true,
          content: {
            identity: identityAll,
            user: userAll,
            workspace: context,
            state: stateAll
          }
        });

      default:
        const workspaceContext = await workspaceStorage.getWorkspaceContext();
        return NextResponse.json({
          success: true,
          content: workspaceContext
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get workspace' },
      { status: 500 }
    );
  }
}

// POST /api/workspace - 保存工作空间内容
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, content } = body;

    switch (file) {
      case 'identity':
        await workspaceStorage.saveIdentity(content);
        break;

      case 'user':
        await workspaceStorage.saveUser(content);
        break;

      case 'soul':
        await workspaceStorage.saveSoulMd(content);
        break;

      case 'agents':
        await workspaceStorage.saveAgentsMd(content);
        break;

      case 'tools':
        await workspaceStorage.saveToolsMd(content);
        break;

      case 'heartbeat':
        await workspaceStorage.saveHeartbeatMd(content);
        break;

      case 'state':
        await workspaceStorage.saveState(content);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid file type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${file} saved successfully`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save workspace' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspace - 清除工作空间
export async function DELETE() {
  try {
    await workspaceStorage.clear();

    return NextResponse.json({
      success: true,
      message: 'Workspace cleared'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear workspace' },
      { status: 500 }
    );
  }
}

// PUT /api/workspace - 导入工作空间
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Data is required for import' },
        { status: 400 }
      );
    }

    await workspaceStorage.importAll(data);

    return NextResponse.json({
      success: true,
      message: 'Workspace imported successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import workspace' },
      { status: 500 }
    );
  }
}
