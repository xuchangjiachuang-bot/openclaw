// OpenClaw Config API - 配置管理接口
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { defaultConfig, type AppConfig } from '@/lib/openclaw/types';

const CONFIG_FILE = '/tmp/openclaw_config.json';

// 深度合并配置
function mergeConfig(defaults: any, saved: any): AppConfig {
  const result = { ...defaults };
  for (const key in saved) {
    if (saved[key] !== null && typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
      result[key] = mergeConfig(defaults[key] || {}, saved[key]);
    } else {
      result[key] = saved[key];
    }
  }
  return result as AppConfig;
}

// 从文件加载配置
function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(data);
      return mergeConfig(defaultConfig, saved);
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return { ...defaultConfig };
}

// 保存配置到文件
function saveConfig(config: AppConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

// GET /api/config - 获取配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    const config = loadConfig();

    // 创建响应并禁用缓存
    const jsonResponse = (data: any) => {
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    };

    switch (section) {
      case 'llm':
        return jsonResponse({
          success: true,
          config: {
            ...config.llm,
            apiKey: config.llm.apiKey ? '******' : ''
          }
        });

      case 'permissions':
        return jsonResponse({
          success: true,
          config: config.permissions
        });

      case 'chat':
        return jsonResponse({
          success: true,
          config: config.chat
        });

      case 'memory':
        return jsonResponse({
          success: true,
          config: config.memory
        });

      case 'defaults':
        return jsonResponse({
          success: true,
          config: defaultConfig
        });

      default:
        return jsonResponse({
          success: true,
          config: {
            ...config,
            llm: {
              ...config.llm,
              apiKey: config.llm.apiKey ? '******' : ''
            }
          }
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get config' },
      { status: 500 }
    );
  }
}

// POST /api/config - 保存配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, config } = body;

    const currentConfig = loadConfig();

    switch (section) {
      case 'llm':
        // 处理API Key：如果是******则保持原值
        if (config.apiKey === '******') {
          config.apiKey = currentConfig.llm.apiKey;
        }
        currentConfig.llm = { ...currentConfig.llm, ...config };
        break;

      case 'permissions':
        currentConfig.permissions = { ...currentConfig.permissions, ...config };
        break;

      case 'chat':
        currentConfig.chat = { ...currentConfig.chat, ...config };
        break;

      default:
        mergeConfig(currentConfig, config);
    }

    saveConfig(currentConfig);

    return NextResponse.json({
      success: true,
      message: '配置已保存'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 }
    );
  }
}

// DELETE /api/config - 重置配置
export async function DELETE() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }

    return NextResponse.json({
      success: true,
      message: '配置已重置'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset config' },
      { status: 500 }
    );
  }
}

// PUT /api/config - 导入配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Config is required' },
        { status: 400 }
      );
    }

    const mergedConfig = mergeConfig(defaultConfig, config);
    saveConfig(mergedConfig);

    return NextResponse.json({
      success: true,
      message: '配置导入成功'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import config' },
      { status: 500 }
    );
  }
}
