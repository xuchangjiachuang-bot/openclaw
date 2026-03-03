#!/bin/bash
# OpenClaw停止脚本

GREEN='\033[0;32m'
NC='\033[0m'

log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo "停止OpenClaw服务..."

# 停止Gateway (端口18789)
if command -v lsof >/dev/null 2>&1; then
    GATEWAY_PID=$(lsof -t -i :18789 2>/dev/null || true)
elif command -v ss >/dev/null 2>&1; then
    GATEWAY_PID=$(ss -lptn 'sport = :18789' 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
fi

if [[ -n "$GATEWAY_PID" ]]; then
    kill $GATEWAY_PID 2>/dev/null || true
    log_success "Gateway已停止"
else
    echo "Gateway未运行"
fi

# 停止Web UI (端口5000)
if command -v lsof >/dev/null 2>&1; then
    WEB_PID=$(lsof -t -i :5000 2>/dev/null || true)
elif command -v ss >/dev/null 2>&1; then
    WEB_PID=$(ss -lptn 'sport = :5000' 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
fi

if [[ -n "$WEB_PID" ]]; then
    kill $WEB_PID 2>/dev/null || true
    log_success "Web UI已停止"
else
    echo "Web UI未运行"
fi

log_success "OpenClaw已完全停止"
