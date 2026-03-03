// OpenAI Codex OAuth API with PKCE
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ==================== PKCE Helper ====================

function generateCodeVerifier(): string {
  // 43-128个字符，使用URL安全字符
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// OAuth状态存储（生产环境应使用Redis或数据库）
const oauthStates = new Map<string, {
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}>();

// 清理过期状态
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStates) {
    if (now - value.createdAt > 600000) { // 10分钟过期
      oauthStates.delete(key);
    }
  }
}, 60000);

// ==================== OpenAI Codex配置 ====================

const OPENAI_AUTH_CONFIG = {
  authorizeUrl: 'https://auth.openai.com/authorize',
  tokenUrl: 'https://auth.openai.com/oauth/token',
  clientId: process.env.OPENAI_CODEX_CLIENT_ID || 'app_OkqCFh2VjJdnvSjRPJsyXkqP',
  // 回调端口1455是OpenAI官方CLI使用的端口
  defaultRedirectPort: 1455,
  scope: 'openid profile email offline_access chat:write chat:read models:read'
};

// ==================== POST - 启动OAuth流程 ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const redirectPort = body.redirectPort || OPENAI_AUTH_CONFIG.defaultRedirectPort;
    const redirectUri = `http://localhost:${redirectPort}/auth/callback`;

    // 生成PKCE参数
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // 存储状态
    oauthStates.set(state, {
      codeVerifier,
      redirectUri,
      createdAt: Date.now()
    });

    // 构建授权URL
    const authUrl = new URL(OPENAI_AUTH_CONFIG.authorizeUrl);
    authUrl.searchParams.set('client_id', OPENAI_AUTH_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', OPENAI_AUTH_CONFIG.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('audience', 'https://api.openai.com/v1');

    console.log('[OAuth] Generated auth URL with PKCE');

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      state,
      instructions: [
        '1. 点击授权链接打开浏览器',
        '2. 使用ChatGPT账户登录并授权',
        '3. 完成后系统将自动获取token',
        '',
        '注意：需要在本地运行回调服务器（端口 ' + redirectPort + '）',
        '或使用CLI命令: npx ts-node scripts/oauth-callback-server.ts'
      ],
      note: 'Authorization URL generated with PKCE. Requires local callback server.'
    });

  } catch (error) {
    console.error('[OAuth] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'OAuth initiation failed' 
      },
      { status: 500 }
    );
  }
}

// ==================== GET - 处理回调/检查状态 ====================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 如果没有code，返回状态检查
  if (!code) {
    return NextResponse.json({
      success: true,
      status: 'waiting',
      message: '等待OAuth授权完成...'
    });
  }

  // 验证state
  const storedState = oauthStates.get(state || '');
  if (!storedState) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired state' },
      { status: 400 }
    );
  }

  const { codeVerifier, redirectUri } = storedState;
  oauthStates.delete(state || '');

  try {
    // 交换code获取token
    const tokenResponse = await fetch(OPENAI_AUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: OPENAI_AUTH_CONFIG.clientId,
        code_verifier: codeVerifier
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[OAuth] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('[OAuth] Token obtained successfully');

    // 返回token信息（实际应用中应存储到安全位置）
    return NextResponse.json({
      success: true,
      authenticated: true,
      token: {
        type: tokenData.token_type,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope
      },
      message: '授权成功！请保存以下配置到环境变量：',
      envConfig: `OPENAI_CODEX_ACCESS_TOKEN=${tokenData.access_token}\nOPENAI_CODEX_REFRESH_TOKEN=${tokenData.refresh_token || ''}`
    });

  } catch (error) {
    console.error('[OAuth] Token exchange error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token exchange failed' 
      },
      { status: 500 }
    );
  }
}
