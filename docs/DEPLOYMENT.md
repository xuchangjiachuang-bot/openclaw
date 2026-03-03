# OpenClaw 部署指南

本文档介绍如何在本地电脑部署OpenClaw AI智能体网关系统。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      OpenClaw 架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐     WebSocket      ┌──────────────────┐  │
│  │   Web UI     │◄──────────────────►│                  │  │
│  │  (port 5000) │                    │                  │  │
│  └──────────────┘                    │   Gateway        │  │
│                                      │   (port 18789)   │  │
│  ┌──────────────┐     WebSocket      │                  │  │
│  │   手机端     │◄──────────────────►│   - 设备配对     │  │
│  │   App        │                    │   - 消息路由     │  │
│  └──────────────┘                    │   - 工具调度     │  │
│                                      │   - 会话管理     │  │
│  ┌──────────────┐     WebSocket      │                  │  │
│  │  消息通道    │◄──────────────────►│                  │  │
│  │ WhatsApp/    │                    └────────┬─────────┘  │
│  │ Telegram/    │                             │            │
│  │ Slack/       │                             │            │
│  └──────────────┘                             │            │
│                                               │            │
│                                      ┌────────▼─────────┐  │
│                                      │   LLM Providers  │  │
│                                      │                  │  │
│                                      │  - OpenAI        │  │
│                                      │  - Anthropic     │  │
│                                      │  - DeepSeek      │  │
│                                      │  - Kimi          │  │
│                                      │  - Coze          │  │
│                                      │  - OpenAI Codex  │  │
│                                      └──────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 方式一：一键安装（推荐）

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/your-repo/openclaw/main/scripts/install.sh | bash

# 或克隆后执行
git clone https://github.com/your-repo/openclaw.git
cd openclaw
chmod +x scripts/install.sh
./scripts/install.sh
```

### 方式二：Docker部署

```bash
# 克隆项目
git clone https://github.com/your-repo/openclaw.git
cd openclaw

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填入API密钥

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 方式三：手动部署

#### 1. 安装依赖

```bash
# 安装Node.js 20+ (推荐使用nvm)
nvm install 20
nvm use 20

# 安装pnpm
npm install -g pnpm pm2

# 安装项目依赖
pnpm install

# 安装Gateway依赖
cd gateway
npm install
npm run build
cd ..
```

#### 2. 配置环境变量

```bash
# 创建.env文件
cat > .env << 'EOF'
# LLM Provider API密钥
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx
KIMI_API_KEY=xxx
COZE_API_KEY=xxx

# OpenAI Codex (ChatGPT订阅)
OPENAI_CODEX_ACCESS_TOKEN=xxx

# Gateway安全Token（可选）
OPENCLAW_GATEWAY_TOKEN=your-secure-token
EOF
```

#### 3. 启动服务

```bash
# 使用PM2管理
pm2 start ecosystem.config.json
pm2 save
pm2 startup

# 或直接启动
# Gateway
cd gateway && npm start &

# Web UI
pnpm dev
```

#### 4. 访问服务

- **Web UI**: http://localhost:5000
- **Gateway WebSocket**: ws://127.0.0.1:18789

## 平台特定说明

### macOS

```bash
# 使用Homebrew安装Node.js
brew install node@20

# 设置开机启动（launchd）
pm2 startup
# 按提示执行命令
pm2 save
```

### Linux (Ubuntu/Debian)

```bash
# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 设置systemd服务
pm2 startup systemd
pm2 save
```

### Windows

```powershell
# 使用Chocolatey安装Node.js
choco install nodejs-lts

# 或下载安装包
# https://nodejs.org/en/download/

# 使用PM2（需要管理员权限）
npm install -g pm2-windows-startup
pm2-startup install
pm2 start ecosystem.config.json
pm2 save
```

## OAuth认证（OpenAI Codex）

OpenAI Codex需要通过OAuth获取token，支持ChatGPT订阅用户访问API：

### 方式一：CLI认证

```bash
# 运行OAuth回调服务器
npx ts-node scripts/oauth-callback-server.ts

# 在另一个终端访问返回的URL
# 完成授权后token会自动保存
```

### 方式二：手动配置

1. 在Web UI的设置页面点击"OpenAI Codex授权"
2. 复制显示的授权URL到浏览器
3. 使用ChatGPT账户登录并授权
4. 复制回调URL中的code参数
5. 在设置页面完成token交换

## 配置文件

配置文件位于 `~/.openclaw/openclaw.json`：

```json
{
  "gateway": {
    "port": 18789,
    "host": "127.0.0.1",
    "token": "your-secure-token"
  },
  "providers": {
    "openai": {
      "enabled": true,
      "model": "gpt-4o",
      "apiKey": "${OPENAI_API_KEY}"
    },
    "anthropic": {
      "enabled": true,
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "${ANTHROPIC_API_KEY}"
    },
    "deepseek": {
      "enabled": true,
      "model": "deepseek-chat",
      "apiKey": "${DEEPSEEK_API_KEY}"
    },
    "kimi": {
      "enabled": true,
      "model": "moonshot-v1-8k",
      "apiKey": "${KIMI_API_KEY}"
    },
    "coze": {
      "enabled": true,
      "botId": "your-bot-id",
      "apiKey": "${COZE_API_KEY}"
    },
    "openai-codex": {
      "enabled": true,
      "model": "codex-mini",
      "accessToken": "${OPENAI_CODEX_ACCESS_TOKEN}"
    }
  },
  "tools": {
    "filesystem": {
      "enabled": true,
      "roots": ["~/Documents", "~/Projects"],
      "readOnly": false
    },
    "code_execute": {
      "enabled": true,
      "sandbox": true,
      "timeout": 30000
    },
    "http_request": {
      "enabled": true,
      "allowedDomains": ["*"]
    }
  },
  "channels": {
    "whatsapp": {
      "enabled": false
    },
    "telegram": {
      "enabled": false,
      "botToken": "${TELEGRAM_BOT_TOKEN}"
    },
    "slack": {
      "enabled": false,
      "botToken": "${SLACK_BOT_TOKEN}"
    }
  }
}
```

## 工具权限

OpenClaw支持以下本地工具：

| 工具 | 描述 | 权限控制 |
|------|------|----------|
| `fs_read` | 读取文件 | 文件系统根目录限制 |
| `fs_write` | 写入文件 | 文件系统根目录限制、只读模式 |
| `fs_list` | 列出目录 | 文件系统根目录限制 |
| `fs_delete` | 删除文件 | 文件系统根目录限制 |
| `fs_search` | 搜索文件 | 文件系统根目录限制 |
| `code_execute` | 执行代码 | 沙箱模式、超时限制 |
| `http_request` | HTTP请求 | 域名白名单 |

## 故障排查

### Gateway无法启动

```bash
# 检查端口占用
lsof -i :18789  # macOS/Linux
netstat -ano | findstr :18789  # Windows

# 检查日志
pm2 logs openclaw-gateway
# 或
tail -f /app/work/logs/bypass/gateway-out.log
```

### WebSocket连接失败

1. 确认Gateway服务正在运行
2. 检查防火墙设置
3. 确认WebSocket URL正确

```bash
# 测试Gateway连接
wscat -c ws://127.0.0.1:18789
```

### OAuth授权失败

1. 确认回调端口(1455)未被占用
2. 检查client_id配置是否正确
3. 确认网络可访问 auth.openai.com

## 安全建议

1. **设置Gateway Token**: 在生产环境中设置 `OPENCLAW_GATEWAY_TOKEN`
2. **限制文件系统访问**: 配置 `tools.filesystem.roots` 限制可访问目录
3. **启用代码执行沙箱**: 保持 `tools.code_execute.sandbox: true`
4. **使用HTTPS**: 在反向代理中配置SSL证书
5. **定期更新**: 保持依赖包更新

## 进阶配置

### 反向代理 (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name openclaw.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Web UI
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 多实例部署

```bash
# 使用PM2集群模式
pm2 start ecosystem.config.json -i max
```

## 联系支持

- GitHub Issues: https://github.com/your-repo/openclaw/issues
- 文档: https://openclaw.dev/docs
