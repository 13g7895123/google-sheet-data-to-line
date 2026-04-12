# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM oven/bun:1 AS builder

WORKDIR /app
COPY package.json ./
RUN bun install

COPY . .
RUN bun run build
# 產出靜態檔案於 /app/dist

# ── Stage 2: Nginx 服務靜態檔案 ───────────────────────────────────────────────
FROM nginx:alpine AS runner

# 複製 build 產出與 Nginx 設定
COPY --from=builder /app/dist          /usr/share/nginx/html
COPY nginx.conf                        /etc/nginx/conf.d/default.conf

EXPOSE 80
