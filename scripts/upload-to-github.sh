#!/bin/bash
# OpenClaw GitHub上传脚本
# 使用GitHub Personal Access Token认证

set -e

# 配置
GITHUB_USER="Xiaohou1"
GITHUB_EMAIL="lobster20260227@outlook.com"
REPO_NAME="openclaw"
REPO_DESC="OpenClaw - 本地AI智能体网关，支持多Provider LLM和本地工具调用"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查token
if [[ -z "$GITHUB_TOKEN" ]]; then
    echo ""
    log_error "未设置 GITHUB_TOKEN 环境变量"
    echo ""
    echo "请按以下步骤获取 Personal Access Token："
    echo ""
    echo "  1. 访问 https://github.com/settings/tokens/new"
    echo "  2. Token名称: openclaw-upload"
    echo "  3. 过期时间: 选择适当时间"
    echo "  4. 勾选权限: repo (全部)"
    echo "  5. 点击 'Generate token'"
    echo "  6. 复制生成的token"
    echo ""
    echo "然后运行："
    echo ""
    echo "  export GITHUB_TOKEN='your-token-here'"
    echo "  bash scripts/upload-to-github.sh"
    echo ""
    exit 1
fi

# 设置git配置
log_info "配置git用户信息..."
git config user.name "$GITHUB_USER"
git config user.email "$GITHUB_EMAIL"

# 创建GitHub仓库
log_info "创建GitHub仓库: $REPO_NAME..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false,\"has_issues\":true,\"has_projects\":true,\"has_wiki\":true}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "201" ]]; then
    log_success "仓库创建成功"
elif [[ "$HTTP_CODE" == "422" ]]; then
    log_warn "仓库已存在，将使用现有仓库"
else
    log_error "创建仓库失败 (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi

# 添加远程仓库
log_info "添加远程仓库..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git"

# 推送代码
log_info "推送代码到GitHub..."
git branch -M main
git push -u origin main --force

log_success "上传完成！"
echo ""
echo "仓库地址: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
