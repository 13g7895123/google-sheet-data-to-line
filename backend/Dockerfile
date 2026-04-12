# ── Stage 1: 安裝依賴 ────────────────────────────────────────────────────────
FROM oven/bun:1 AS deps

WORKDIR /app
COPY package.json ./
RUN bun install

# ── Stage 2: 產生 Prisma Client ───────────────────────────────────────────────
FROM deps AS builder

COPY . .
RUN bunx prisma generate

# ── Stage 3: 最終 Runtime 映像 ────────────────────────────────────────────────
FROM oven/bun:1 AS runner

WORKDIR /app
ENV NODE_ENV=production

# 複製必要檔案
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/generated     ./generated
COPY --from=builder /app/prisma        ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src           ./src
COPY --from=builder /app/index.ts      ./index.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

# 啟動前先執行 Migration，再啟動伺服器
CMD ["sh", "-c", "bunx prisma migrate deploy && bun index.ts"]
