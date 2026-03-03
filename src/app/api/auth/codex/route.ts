// OpenAI Codex OAuth API
import { NextRequest, NextResponse } from 'next/server';

// POST - 启动OAuth流程
export async function POST(request: NextRequest) {
  try {
    // OpenAI Codex OAuth配置
    const CLIENT_ID = process.env.OPENAI_CODEX_CLIENT_ID || 'openai-codex-cli';
    const REDIRECT_URI = process.env.OPENAI_CODEX_REDIRECT_URI || `http://localhost:18789/auth/callback`;
    
    // 构建授权URL
    const authUrl = new URL('https://auth.openai.com/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'chat:write chat:read models:read');
    authUrl.searchParams.set('state', Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    })).toString('base64'));

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      message: '请在浏览器中完成授权，或在终端运行: openclaw models auth login --provider openai-codex',
      instructions: [
        '1. 点击授权链接或在浏览器中打开',
        '2. 使用您的ChatGPT账户登录',
        '3. 授权OpenClaw访问',
        '4. 完成后token将自动保存',
        '',
        '或者使用CLI命令:',
        'openclaw models auth login --provider openai-codex'
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OAuth initiation failed' },
      { status: 500 }
    );
  }
}

// GET - 检查OAuth状态
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json({
      success: false,
      authenticated: false,
      message: '未授权。请先完成OAuth流程。'
    });
  }

  try {
    // 交换code获取token
    const CLIENT_ID = process.env.OPENAI_CODEX_CLIENT_ID || 'openai-codex-cli';
    const REDIRECT_URI = process.env.OPENAI_CODEX_REDIRECT_URI || `http://localhost:18789/auth/callback`;
    
    const tokenResponse = await fetch('https://auth.openai.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID
      }).toString()
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokenData = await tokenResponse.json();
    
    // 保存token（实际应用中应存储到安全位置）
    // 这里返回给前端让用户手动配置
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      message: '授权成功！Token已获取，请保存配置。',
      note: '在实际部署中，token应存储在服务端安全存储中'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token exchange failed' 
      },
      { status: 500 }
    );
  }
}
