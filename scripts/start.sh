#!/bin/bash
# OpenClaw启动脚本

set -e

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# 获取脚本目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# 检查Gateway是否运行
check_gateway() {
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :18789 >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln 2>/dev/null | grep -q ':18789'
    else
        return 1
    fi
}

# 启动Gateway
start_gateway() {
    if check_gateway; then
        log_info "Gateway已在运行 (端口 18789)"
        return 0
    fi

    log_info "启动Gateway..."
    cd "$PROJECT_ROOT/gateway"
    
    # 检查是否已构建
    if [[ ! -d "dist" ]]; then
        log_info "构建Gateway..."
        npm run build
    fi
    
    # 后台启动
    nohup node dist/server.js > /app/work/logs/bypass/gateway.log 2>&1 &
    
    # 等待启动
    for i in {1..10}; do
        sleep 0.5
        if check_gateway; then
            log_success "Gateway启动成功"
            return 0
        fi
    done
    
    echo "Gateway启动失败，请检查日志"
    return 1
}

# 主流程
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║           OpenClaw 启动中...           ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # 启动Gateway
    start_gateway
    
    # 启动Web UI (使用coze dev)
    log_info "启动Web UI..."
    cd "$PROJECT_ROOT"
    
    exec coze dev
}

main "$@"
