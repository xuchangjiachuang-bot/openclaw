FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 18789 1455

# 创建数据目录
RUN mkdir -p /data

# 启动
CMD ["node", "dist/server.js"]
