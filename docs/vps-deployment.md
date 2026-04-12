# VPS 部署指南

本文件提供兩種部署方式：
- **[方式一：Docker Compose（推薦）](#方式一docker-compose-部署推薦)** — 一行指令啟動，環境隔離、易維護
- **[方式二：手動部署](#方式二手動部署)** — 直接在 VPS 上安裝 Bun + Nginx，彈性較高

---

## 必須設定的外部服務（兩種方式皆需）

### 1. LINE Messaging API

前往 [LINE Developers Console](https://developers.line.biz/) 建立 Provider 與 Channel：

1. 建立 **Messaging API** Channel
2. 取得以下資訊：
   - `LINE_CHANNEL_ACCESS_TOKEN`（Channel access token (long-lived)）
   - `LINE_CHANNEL_SECRET`（Channel secret）
3. 在 Channel 設定頁面的 **Webhook URL** 填入：
   ```
   https://你的網域/api/webhook/line
   ```
4. 開啟 **Use webhook** 開關
5. **重要**：Webhook URL 必須是 HTTPS，所以 SSL 憑證是必要條件

### 2. Google Sheets API（Service Account）

前往 [Google Cloud Console](https://console.cloud.google.com/)：

1. 建立或選擇一個 GCP Project
2. 啟用 **Google Sheets API** 與 **Google Drive API**
3. 建立 **Service Account**：
   - IAM & Admin → Service Accounts → Create Service Account
   - 不需要額外的 IAM 角色
4. 建立 JSON 金鑰：
   - 進入 Service Account → Keys → Add Key → JSON
   - 下載 JSON 檔，取出以下兩個欄位：
     - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `private_key` → `GOOGLE_PRIVATE_KEY`（完整字串，包含 `-----BEGIN PRIVATE KEY-----`）
5. **共用試算表給 Service Account**：
   - 每一份要讀取的 Google Sheet，必須共用給 Service Account 的 email（Viewer 權限即可）

> **提示**：以上憑證也可以在系統部署完成後，透過管理介面的「設定」頁面輸入，不一定要寫在 `.env`。

---

## 方式一：Docker Compose 部署（推薦）

### 架構說明

```
瀏覽器 / LINE Webhook
        │  HTTPS
┌───────▼──────────────────────────────┐
│  VPS 外層 Nginx（port 80 / 443）      │  ← Certbot 管理 SSL 憑證
│  proxy_pass http://127.0.0.1:8080    │
└───────┬──────────────────────────────┘
        │  HTTP
┌───────▼─────────────────────────────────────┐  Docker Network
│  frontend 容器 Nginx（host:8080→容器:80）    │
│  ├── /        靜態 React build              │
│  └── /api/*  ─▶ proxy to backend:3000      │
│                      │                      │
│             ┌────────▼──────────┐           │
│             │ backend 容器      │           │
│             │ Bun + Hono :3000  │           │
│             │（不對外暴露 port） │           │
│             └────────┬──────────┘           │
│                      │                      │
│             ┌────────▼──────────┐           │
│             │ Volume: db_data   │           │
│             │ /app/data/app.db  │           │
│             └───────────────────┘           │
└─────────────────────────────────────────────┘
```

### 必要條件

- VPS 上已安裝 **Docker** 與 **Docker Compose v2**
- 已完成上方「[必須設定的外部服務](#必須設定的外部服務兩種方式皆需)」章節中的 LINE 與 Google 設定

### Docker Compose 部署流程

#### Step 1：安裝 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # 免 sudo 使用 docker
newgrp docker
docker --version && docker compose version
```

#### Step 2：上傳程式碼

```bash
git clone <你的 repository URL> /var/www/line-sheet-bot
cd /var/www/line-sheet-bot
```

#### Step 3：建立 `.env` 設定檔

```bash
cp .env.example .env
nano .env
```

填入 LINE 與 Google 憑證（若想透過管理介面設定可留空）：

```env
LINE_CHANNEL_ACCESS_TOKEN=你的token
LINE_CHANNEL_SECRET=你的secret
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> `GOOGLE_PRIVATE_KEY` 的多行文字需用雙引號包住，換行以 `\n` 表示。

#### Step 4：啟動服務

```bash
docker compose up -d --build
```

首次啟動會自動：
1. Build backend 映像（安裝依賴、產生 Prisma Client）
2. Build frontend 映像（Vite build → Nginx）
3. 執行 `prisma migrate deploy`（建立 SQLite DB）
4. 啟動兩個容器

確認服務狀態：

```bash
docker compose ps
docker compose logs backend       # 查看 backend 啟動日誌
curl http://localhost:8080/health  # 應回傳 {"ok":true}（此時尚未啟外層 Nginx）
```

#### Step 5：設定 Nginx + HTTPS（Certbot）

Docker frontend 容器已綁定在 host port **8080**，需在 VPS 上安裝**外層 Nginx** 監聽 port 80/443，再透過 Certbot 取得 SSL，最後將流量轉給 port 8080。

> **為什麼需要外層 Nginx？**
> Docker frontend 容器是 HTTP only，不處理 SSL。把 SSL 終止放在外層 Nginx 是最常見且易維護的做法；Certbot 也只需管理這一層。

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

建立 `/etc/nginx/sites-available/line-sheet-bot`：

```nginx
server {
    listen 80;
    server_name 你的網域;

    # 將所有流量轉給 Docker frontend 容器（port 8080）
    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/line-sheet-bot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的網域
```

#### Step 6：設定 LINE Webhook URL

前往 LINE Developers Console，Webhook URL 填入：

```
https://你的網域/api/webhook/line
```

#### Step 7：更新部署

```bash
cd /var/www/line-sheet-bot
git pull
docker compose up -d --build   # 重新 build 並替換容器（停機時間極短）
```

### 常用 Docker 維運指令

```bash
docker compose ps                       # 查看容器狀態
docker compose logs -f backend          # 即時查看 backend log
docker compose logs -f frontend         # 即時查看 frontend log
docker compose restart backend          # 重啟 backend
docker compose down                     # 停止並移除容器（資料不受影響）
docker compose down -v                  # ⚠️ 停止並刪除 volume（資料庫會被清除）

# 進入 backend 容器執行指令
docker compose exec backend sh
```

### 資料備份

SQLite 資料庫存放於 Docker volume `db_data`，備份方式：

```bash
# 備份
docker compose exec backend sh -c "cp /app/data/app.db /app/data/app.db.bak"
docker cp $(docker compose ps -q backend):/app/data/app.db ./backup-$(date +%Y%m%d).db

# 還原
docker cp ./backup-20260412.db $(docker compose ps -q backend):/app/data/app.db
docker compose restart backend
```

---

## 方式二：手動部署

### 概覽

本系統由以下元件組成，部署到 VPS 時需一併配置：

| 元件 | 技術 | 說明 |
|------|------|------|
| Backend | Bun + Hono | API 伺服器，預設監聽 port 3000 |
| Frontend | React + Vite | 靜態檔案，由 Nginx 直接服務 |
| Database | SQLite | 資料庫檔案存放於伺服器本地 |
| Reverse Proxy | Nginx | 統一入口，處理 HTTPS 與靜態資源 |
| 排程系統 | node-cron | 內嵌於 Backend 程序，無需額外服務 |

> LINE / Google 憑證設定請參考上方「[必須設定的外部服務](#必須設定的外部服務兩種方式皆需)」章節。

---

## 一、VPS 環境準備

以下以 **Ubuntu 22.04 LTS** 為例。

### 2.1 安裝 Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### 2.2 安裝 Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 2.3 安裝 Certbot（Let's Encrypt SSL）

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2.4 安裝 PM2（程序管理）

```bash
# PM2 需要 Node.js，用來管理 Bun 程序
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
pm2 startup   # 依照指示執行輸出的指令，讓 PM2 在開機時自動啟動
```

---

## 二、部署流程

### Step 1：上傳程式碼

```bash
# 在 VPS 上選定工作目錄
mkdir -p /var/www/line-sheet-bot
cd /var/www/line-sheet-bot

# 使用 git clone（推薦）或 scp 上傳
git clone <你的 repository URL> .
```

### Step 2：設定 Backend 環境變數

```bash
cd /var/www/line-sheet-bot/backend
cp .env.example .env    # 若無範例檔，手動建立
nano .env
```

`.env` 內容範例（最小必要設定）：

```env
PORT=3000
NODE_ENV=production

# 若不透過管理介面設定，可填在此處
# LINE_CHANNEL_ACCESS_TOKEN=
# LINE_CHANNEL_SECRET=
# GOOGLE_SERVICE_ACCOUNT_EMAIL=
# GOOGLE_PRIVATE_KEY=
```

> 若選擇透過管理介面的「設定」頁輸入 LINE / Google 憑證，則這裡可以留空。

### Step 3：安裝 Backend 依賴並執行 DB Migration

```bash
cd /var/www/line-sheet-bot/backend
bun install
bunx prisma migrate deploy    # 正式環境使用 deploy，不用 dev
bunx prisma generate
```

### Step 4：Build Frontend

```bash
cd /var/www/line-sheet-bot/frontend
bun install
bun run build
# 產出靜態檔案於 frontend/dist/
```

### Step 5：使用 PM2 啟動 Backend

```bash
cd /var/www/line-sheet-bot/backend

pm2 start bun --name "line-sheet-bot" -- run start
pm2 save   # 儲存 PM2 程序清單，開機後自動恢復
```

確認服務正常啟動：

```bash
pm2 status
pm2 logs line-sheet-bot --lines 50
curl http://localhost:3000/health
```

回應應為 `{"ok":true,"ts":"..."}` 表示正常。

### Step 6：設定 Nginx

建立 Nginx 設定檔：

```bash
sudo nano /etc/nginx/sites-available/line-sheet-bot
```

填入以下內容（替換 `你的網域`）：

```nginx
server {
    listen 80;
    server_name 你的網域;

    # 前端靜態檔案
    root /var/www/line-sheet-bot/frontend/dist;
    index index.html;

    # 前端 SPA：所有非 API 路徑都回傳 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 請求反向代理到 Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

啟用設定並重啟 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/line-sheet-bot /etc/nginx/sites-enabled/
sudo nginx -t        # 檢查設定語法
sudo systemctl reload nginx
```

### Step 7：申請 SSL 憑證

```bash
sudo certbot --nginx -d 你的網域
# 依照提示輸入 email，同意條款，選擇強制 HTTPS redirect
```

Certbot 會自動修改 Nginx 設定加入 HTTPS，並設定自動續期。

驗證 HTTPS 是否正常：

```bash
curl https://你的網域/health
```

### Step 8：設定 LINE Webhook URL

回到 LINE Developers Console，將 Webhook URL 更新為：

```
https://你的網域/api/webhook/line
```

按下 **Verify** 按鈕，若顯示成功即完成串接。

### Step 9：透過管理介面完成設定

開啟瀏覽器前往 `https://你的網域`，進入「設定」頁面填入：

- Google Service Account Email
- Google Private Key
- LINE Channel Access Token
- LINE Channel Secret

儲存後系統即可正常運作。

---

## 三、防火牆設定

VPS 防火牆只需開放以下 port：

```bash
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP（Certbot 驗證用）
sudo ufw allow 443    # HTTPS
sudo ufw enable
```

Port 3000（Backend）**不需要**對外開放，只由本機 Nginx 存取。

---

## 四、更新部署流程

當程式碼有更新時：

```bash
cd /var/www/line-sheet-bot
git pull

# 若 Backend 有異動
cd backend
bun install
bunx prisma migrate deploy
pm2 restart line-sheet-bot

# 若 Frontend 有異動
cd ../frontend
bun install
bun run build
# Nginx 自動服務新的 dist/，不需重啟
```

---

## 五、常見問題排查

| 問題 | 排查指令 |
|------|---------|
| Backend 沒有回應 | `pm2 logs line-sheet-bot` |
| Nginx 502 Bad Gateway | 確認 `pm2 status` 是否 online |
| LINE Webhook 驗證失敗 | 確認 HTTPS 憑證、Nginx 代理設定、`/api/webhook/line` 路由 |
| Google Sheet 無法讀取 | 確認 Service Account email 已被加為試算表共用者 |
| DB 沒有資料 | 確認 `bunx prisma migrate deploy` 已執行 |
| 排程沒有觸發 | PM2 程序是否正常、查看 `pm2 logs` 中的 Scheduler 輸出 |

> Docker Compose 部署版本請參考方式一的「[常用 Docker 維運指令](#常用-docker-維運指令)」。
