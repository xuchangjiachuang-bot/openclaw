#!/bin/bash
# OpenClaw 一键安装脚本
# 支持 macOS / Linux (Ubuntu/Debian/CentOS)

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 安装Node.js
install_nodejs() {
    log_info "安装 Node.js 20..."
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        if command_exists brew; then
            brew install node@20
        else
            log_error "请先安装 Homebrew: https://brew.sh"
            exit 1
        fi
    elif [[ "$os" == "ubuntu" ]] || [[ "$os" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$os" == "centos" ]] || [[ "$os" == "rhel" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        log_error "不支持的操作系统: $os"
        log_info "请手动安装 Node.js 20: https://nodejs.org"
        exit 1
    fi
    
    log_success "Node.js 安装完成: $(node -v)"
}

# 安装pnpm
install_pnpm() {
    if ! command_exists pnpm; then
        log_info "安装 pnpm..."
        npm install -g pnpm
        log_success "pnpm 安装完成: $(pnpm -v)"
    else
        log_info "pnpm 已安装: $(pnpm -v)"
    fi
}

# 安装PM2
install_pm2() {
    if ! command_exists pm2; then
        log_info "安装 PM2..."
        npm install -g pm2
        log_success "PM2 安装完成"
    else
        log_info "PM2 已安装"
    fi
}

# 主安装流程
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║      OpenClaw 安装向导 v1.0           ║"
    echo "║  本地AI智能体网关 - 多Provider支持     ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # 检查Node.js
    if ! command_exists node; then
        log_warn "未检测到 Node.js"
        install_nodejs
    else
        local node_version=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if [[ $node_version -lt 18 ]]; then
            log_warn "Node.js 版本过低 (当前: $(node -v), 需要: >=18)"
            install_nodejs
        else
            log_success "Node.js 版本符合要求: $(node -v)"
        fi
    fi
    
    # 安装其他依赖
    install_pnpm
    install_pm2
    
    # 安装项目依赖
    log_info "安装项目依赖..."
    
    # Web UI
    pnpm install
    
    # Gateway
    cd gateway
    npm install
    npm run build
    cd ..
    
    log_success "依赖安装完成"
    
    # 创建配置目录
    log_info "创建配置目录..."
    mkdir -p ~/.openclaw
    
    # 创建默认配置
    if [[ ! -f ~/.openclaw/openclaw.json ]]; then
        cat > ~/.openclaw/openclaw.json << 'EOF'
{
  "gateway": {
    "port": 18789,
    "host": "127.0.0.1"
  },
  "providers": {
    "openai": {
      "enabled": true,
      "model": "gpt-4o"
    },
    "anthropic": {
      "enabled": true,
      "model": "claude-3-5-sonnet-20241022"
    }
  },
  "tools": {
    "filesystem": {
      "enabled": true,
      "roots": ["~"]
    },
    "code_execute": {
      "enabled": true,
      "sandbox": true
    }
  }
}
EOF
        log_success "配置文件已创建: ~/.openclaw/openclaw.json"
    fi
    
    # 提示设置环境变量
    echo ""
    log_info "接下来请设置API密钥环境变量："
    echo ""
    echo "  export OPENAI_API_KEY='your-openai-api-key'"
    echo "  export ANTHROPIC_API_KEY='your-anthropic-api-key'"
    echo "  export DEEPSEEK_API_KEY='your-deepseek-api-key'"
    echo "  export KIMI_API_KEY='your-kimi-api-key'"
    echo "  export COZE_API_KEY='your-coze-api-key'"
    echo ""
    
    # 启动服务
    read -p "是否现在启动服务？[Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "启动服务..."
        pm2 start ecosystem.config.json
        pm2 save
        pm2 startup
        log_success "服务已启动"
        echo ""
        echo "  Gateway: ws://127.0.0.1:18789"
        echo "  Web UI:  http://localhost:5000"
        echo ""
        echo "  查看状态: pm2 status"
        echo "  查看日志: pm2 logs openclaw-gateway"
        echo "  停止服务: pm2 stop all"
    fi
    
    echo ""
    log_success "安装完成！"
    echo ""
    echo "更多信息请访问: https://github.com/your-repo/openclaw"
}

main "$@"
