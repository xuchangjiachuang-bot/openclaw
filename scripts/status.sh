#!/bin/bash
# OpenClaw状态检查脚本

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :$port >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln 2>/dev/null | grep -q ":$port"
    else
        return 1
    fi
}

echo "╔════════════════════════════════════════╗"
echo "║         OpenClaw 服务状态              ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Gateway状态
printf "Gateway (18789): "
if check_port 18789; then
    echo -e "${GREEN}● 运行中${NC}"
else
    echo -e "${RED}○ 未运行${NC}"
fi

# Web UI状态
printf "Web UI  (5000):  "
if check_port 5000; then
    echo -e "${GREEN}● 运行中${NC}"
else
    echo -e "${RED}○ 未运行${NC}"
fi

# Canvas状态（可选）
printf "Canvas  (18793): "
if check_port 18793; then
    echo -e "${GREEN}● 运行中${NC}"
else
    echo -e "${YELLOW}○ 未运行 (可选)${NC}"
fi

echo ""

# 显示进程信息
if command -v pm2 >/dev/null 2>&1; then
    echo "PM2进程:"
    pm2 list 2>/dev/null | grep -E "openclaw|id.*name" || echo "  无PM2进程"
fi

echo ""
echo "日志目录: /app/work/logs/bypass/"
echo "配置目录: ~/.openclaw/"
