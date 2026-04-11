# Google Sheet Data to LINE 推播系統 — 架構設計文件

## 1. 專案概述

本系統為一個網頁管理平台，主要功能為將 Google Sheet 上的資料，透過 LINE Bot 發送給對應的使用者。系統支援建立多個「Case（案例）」，每個 Case 可獨立設定資料來源（Google Sheet + Sheet 頁籤）、接收對象（LINE 好友）、以及排程預先發送等功能。

### 1.1 核心需求

- 連接 Google Sheet，支援選擇特定的 Spreadsheet 與其中的 Sheet（工作表）
- 整合 LINE Bot，可取得所有好友名單
- 以「Case」為最小操作單位，每個 Case 綁定一組資料來源與接收對象
- 支援預先排程設定，可定時自動推播
- 提供網頁管理介面進行 Case 的 CRUD 操作

---

## 2. 系統架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│  │ Dashboard  │ │Case 管理  │ │排程管理    │ │發送紀錄  │ │
│  └───────────┘ └───────────┘ └───────────┘ └─────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                   Backend (Next.js API Routes)          │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │Case Service│ │Schedule Svc│ │  Notification Service│ │
│  └─────┬──────┘ └─────┬──────┘ └──────────┬───────────┘ │
│        │              │                    │             │
│  ┌─────▼──────────────▼────────────────────▼───────────┐ │
│  │              Core Services Layer                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │ │
│  │  │Google Sheets  │  │LINE Bot      │  │Scheduler  │  │ │
│  │  │Integration   │  │Integration   │  │(node-cron)│  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │ │
│  └─────────┼─────────────────┼────────────────┼────────┘ │
└────────────┼─────────────────┼────────────────┼──────────┘
             │                 │                │
     ┌───────▼───────┐ ┌──────▼──────┐  ┌──────▼──────┐
     │ Google Sheets  │ │ LINE        │  │  Database   │
     │ API            │ │ Messaging   │  │ (SQLite /   │
     │                │ │ API         │  │  PostgreSQL)│
     └────────────────┘ └─────────────┘  └─────────────┘
```

---

## 3. 技術選型

| 類別 | 技術 | 說明 |
|------|------|------|
| 執行環境/套件管理 | **Bun** | 取代 Node.js + npm，更快的執行與安裝速度 |
| 框架 | **Next.js 14+ (App Router)** | 前後端整合，API Routes 作為後端 |
| 語言 | **TypeScript** | 型別安全 |
| 資料庫 | **SQLite (開發) / PostgreSQL (正式)** | 輕量起步，可擴展 |
| ORM | **Prisma** | 資料庫操作與 Migration |
| 排程 | **node-cron** | 定時任務排程 |
| Google API | **googleapis** | Google Sheets API v4 |
| LINE API | **@line/bot-sdk** | LINE Messaging API |
| UI 元件庫 | **shadcn/ui + Tailwind CSS** | 快速建構管理介面 |
| 驗證 | **NextAuth.js** | 管理者登入驗證（選配） |
| 狀態管理 | **React Query (TanStack Query)** | API 資料快取與同步 |

---

## 4. 資料庫 Schema 設計

### 4.1 ER Diagram

```
┌──────────────────┐       ┌──────────────────┐
│   google_sheets  │       │   line_friends    │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ spreadsheet_id   │       │ line_user_id     │
│ spreadsheet_name │       │ display_name     │
│ created_at       │       │ picture_url      │
│ updated_at       │       │ status_message   │
└────────┬─────────┘       │ synced_at        │
         │                 └────────┬─────────┘
         │ 1:N                      │
┌────────▼─────────┐               │
│   sheet_tabs     │               │
├──────────────────┤               │
│ id (PK)          │               │
│ google_sheet_id  │(FK)           │
│ sheet_name       │               │
│ gid              │               │
└────────┬─────────┘               │
         │                         │
         │ N:1                     │ N:M
┌────────▼─────────────────────────▼──┐
│              cases                   │
├──────────────────────────────────────┤
│ id (PK)                             │
│ name                                │
│ description                         │
│ google_sheet_id (FK)                │
│ sheet_tab_id (FK)                   │
│ message_template                    │
│ status (draft/active/paused/done)   │
│ created_at                          │
│ updated_at                          │
└────────┬────────────────┬───────────┘
         │                │
         │ 1:N            │ 1:N (透過中間表)
┌────────▼─────────┐  ┌───▼──────────────┐
│   schedules      │  │ case_recipients  │
├──────────────────┤  ├──────────────────┤
│ id (PK)          │  │ id (PK)          │
│ case_id (FK)     │  │ case_id (FK)     │
│ cron_expression  │  │ line_friend_id   │(FK)
│ scheduled_at     │  └──────────────────┘
│ is_recurring     │
│ is_active        │
│ last_run_at      │
│ next_run_at      │
└────────┬─────────┘
         │
         │ 1:N
┌────────▼─────────┐
│   send_logs      │
├──────────────────┤
│ id (PK)          │
│ case_id (FK)     │
│ schedule_id (FK) │ (nullable, 手動發送時為 null)
│ line_user_id     │
│ message_content  │
│ status           │ (success/failed)
│ error_message    │
│ sent_at          │
└──────────────────┘
```

### 4.2 Prisma Schema

```prisma
model GoogleSheet {
  id              String     @id @default(cuid())
  spreadsheetId   String     @unique
  spreadsheetName String
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  tabs            SheetTab[]
  cases           Case[]
}

model SheetTab {
  id            String      @id @default(cuid())
  googleSheetId String
  googleSheet   GoogleSheet @relation(fields: [googleSheetId], references: [id], onDelete: Cascade)
  sheetName     String
  gid           String
  cases         Case[]
}

model LineFriend {
  id            String           @id @default(cuid())
  lineUserId    String           @unique
  displayName   String
  pictureUrl    String?
  statusMessage String?
  syncedAt      DateTime         @default(now())
  recipients    CaseRecipient[]
}

model Case {
  id              String          @id @default(cuid())
  name            String
  description     String?
  googleSheetId   String
  googleSheet     GoogleSheet     @relation(fields: [googleSheetId], references: [id])
  sheetTabId      String
  sheetTab        SheetTab        @relation(fields: [sheetTabId], references: [id])
  messageTemplate String
  status          CaseStatus      @default(DRAFT)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  recipients      CaseRecipient[]
  schedules       Schedule[]
  sendLogs        SendLog[]
}

model CaseRecipient {
  id           String     @id @default(cuid())
  caseId       String
  case         Case       @relation(fields: [caseId], references: [id], onDelete: Cascade)
  lineFriendId String
  lineFriend   LineFriend @relation(fields: [lineFriendId], references: [id])

  @@unique([caseId, lineFriendId])
}

model Schedule {
  id             String    @id @default(cuid())
  caseId         String
  case           Case      @relation(fields: [caseId], references: [id], onDelete: Cascade)
  cronExpression String?
  scheduledAt    DateTime?
  isRecurring    Boolean   @default(false)
  isActive       Boolean   @default(true)
  lastRunAt      DateTime?
  nextRunAt      DateTime?
  sendLogs       SendLog[]
}

model SendLog {
  id             String   @id @default(cuid())
  caseId         String
  case           Case     @relation(fields: [caseId], references: [id])
  scheduleId     String?
  schedule       Schedule? @relation(fields: [scheduleId], references: [id])
  lineUserId     String
  messageContent String
  status         SendStatus
  errorMessage   String?
  sentAt         DateTime @default(now())
}

enum CaseStatus {
  DRAFT
  ACTIVE
  PAUSED
  DONE
}

enum SendStatus {
  SUCCESS
  FAILED
}
```

---

## 5. API 端點設計

### 5.1 Google Sheet 相關

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/google-sheets` | 新增 Google Sheet（輸入 spreadsheet URL/ID） |
| GET | `/api/google-sheets` | 取得所有已註冊的 Google Sheets |
| GET | `/api/google-sheets/:id` | 取得單一 Google Sheet 詳細資訊 |
| GET | `/api/google-sheets/:id/tabs` | 取得該 Sheet 的所有工作表（tabs） |
| GET | `/api/google-sheets/:id/tabs/:tabId/preview` | 預覽工作表資料（前 10 筆） |
| DELETE | `/api/google-sheets/:id` | 移除已註冊的 Google Sheet |

### 5.2 LINE 好友相關

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/line/friends` | 取得所有 LINE 好友列表 |
| POST | `/api/line/friends/sync` | 從 LINE API 同步好友名單 |
| GET | `/api/line/friends/:id` | 取得單一好友資訊 |

### 5.3 Case 管理

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/cases` | 建立新 Case |
| GET | `/api/cases` | 取得所有 Cases（支援分頁、篩選） |
| GET | `/api/cases/:id` | 取得單一 Case 詳細資訊 |
| PUT | `/api/cases/:id` | 更新 Case |
| DELETE | `/api/cases/:id` | 刪除 Case |
| POST | `/api/cases/:id/send` | 立即執行發送 |
| GET | `/api/cases/:id/logs` | 取得該 Case 的發送紀錄 |

### 5.4 排程相關

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/cases/:caseId/schedules` | 為 Case 建立排程 |
| GET | `/api/cases/:caseId/schedules` | 取得 Case 的排程列表 |
| PUT | `/api/schedules/:id` | 更新排程 |
| DELETE | `/api/schedules/:id` | 刪除排程 |
| POST | `/api/schedules/:id/toggle` | 啟用/停用排程 |

### 5.5 系統相關

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/dashboard/stats` | 儀表板統計資料 |
| GET | `/api/logs` | 全域發送紀錄（支援分頁、篩選） |
| POST | `/api/webhook/line` | LINE Webhook 端點（接收好友事件） |

---

## 6. 前端頁面規劃

### 6.1 頁面結構

```
/                           → 儀表板 Dashboard
/cases                      → Case 列表頁
/cases/new                  → 新增 Case（步驟式表單）
/cases/:id                  → Case 詳情頁
/cases/:id/edit             → 編輯 Case
/google-sheets              → Google Sheet 管理頁
/google-sheets/:id          → Sheet 詳情（含工作表列表）
/line-friends               → LINE 好友列表頁
/schedules                  → 排程總覽頁
/logs                       → 發送紀錄頁
/settings                   → 系統設定頁（API Key 管理等）
```

### 6.2 Case 建立流程（步驟式表單）

```
Step 1: 基本資訊
  ├─ Case 名稱
  └─ Case 描述

Step 2: 選擇資料來源
  ├─ 選擇 Google Sheet（下拉選單 / 新增）
  ├─ 選擇工作表 Tab（依上方選擇動態載入）
  └─ 資料預覽

Step 3: 設定訊息模板
  ├─ 訊息模板編輯器
  ├─ 可用欄位（從 Sheet 欄位動態取得）
  └─ 模板預覽

Step 4: 選擇接收者
  ├─ LINE 好友列表（多選 checkbox）
  ├─ 搜尋 / 篩選
  └─ 已選擇清單

Step 5: 排程設定（選配）
  ├─ 是否啟用排程
  ├─ 單次排程 → 選擇日期時間
  └─ 週期排程 → Cron 設定 UI

Step 6: 確認與建立
  ├─ 所有設定摘要
  └─ 確認送出
```

### 6.3 核心 UI 元件

| 元件 | 說明 |
|------|------|
| `SheetSelector` | Google Sheet 選擇器，含 Spreadsheet + Tab 二級聯動 |
| `FriendPicker` | LINE 好友多選器，支援搜尋與全選 |
| `MessageTemplateEditor` | 訊息模板編輯器，支援插入欄位變數 `{{column_name}}` |
| `CronBuilder` | 排程設定 UI，視覺化 Cron 設定 |
| `SendLogTable` | 發送紀錄表格，支援狀態篩選與分頁 |
| `CaseCard` | Case 卡片元件，顯示摘要資訊與快捷操作 |

---

## 7. 專案目錄結構

```
google-sheet-data-to-line/
├── docs/
│   └── architecture.md              ← 本文件
├── prisma/
│   └── schema.prisma                # Prisma Schema
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard
│   │   ├── cases/
│   │   │   ├── page.tsx             # Case 列表
│   │   │   ├── new/
│   │   │   │   └── page.tsx         # 新增 Case
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Case 詳情
│   │   │       └── edit/
│   │   │           └── page.tsx     # 編輯 Case
│   │   ├── google-sheets/
│   │   │   ├── page.tsx             # Sheet 管理
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Sheet 詳情
│   │   ├── line-friends/
│   │   │   └── page.tsx             # 好友列表
│   │   ├── schedules/
│   │   │   └── page.tsx             # 排程總覽
│   │   ├── logs/
│   │   │   └── page.tsx             # 發送紀錄
│   │   ├── settings/
│   │   │   └── page.tsx             # 系統設定
│   │   └── api/
│   │       ├── google-sheets/
│   │       │   ├── route.ts         # GET, POST
│   │       │   └── [id]/
│   │       │       ├── route.ts     # GET, DELETE
│   │       │       └── tabs/
│   │       │           └── route.ts
│   │       ├── line/
│   │       │   ├── friends/
│   │       │   │   ├── route.ts
│   │       │   │   └── sync/
│   │       │   │       └── route.ts
│   │       │   └── webhook/
│   │       │       └── route.ts
│   │       ├── cases/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── send/
│   │       │       │   └── route.ts
│   │       │       ├── logs/
│   │       │       │   └── route.ts
│   │       │       └── schedules/
│   │       │           └── route.ts
│   │       ├── schedules/
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── toggle/
│   │       │           └── route.ts
│   │       ├── dashboard/
│   │       │   └── stats/
│   │       │       └── route.ts
│   │       └── logs/
│   │           └── route.ts
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 元件
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── cases/
│   │   │   ├── CaseCard.tsx
│   │   │   ├── CaseForm.tsx
│   │   │   └── CaseList.tsx
│   │   ├── sheets/
│   │   │   ├── SheetSelector.tsx
│   │   │   └── SheetPreview.tsx
│   │   ├── line/
│   │   │   └── FriendPicker.tsx
│   │   ├── message/
│   │   │   └── MessageTemplateEditor.tsx
│   │   └── schedule/
│   │       └── CronBuilder.tsx
│   ├── lib/
│   │   ├── prisma.ts                # Prisma Client 實例
│   │   ├── google-sheets.ts         # Google Sheets API 封裝
│   │   ├── line-bot.ts              # LINE Bot SDK 封裝
│   │   └── scheduler.ts             # 排程管理器
│   ├── hooks/
│   │   ├── useCases.ts
│   │   ├── useGoogleSheets.ts
│   │   ├── useLineFriends.ts
│   │   └── useSchedules.ts
│   └── types/
│       └── index.ts                 # 共用型別定義
├── .env.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── bun.lock
├── package.json
└── README.md
```

---

## 8. 核心流程說明

### 8.1 Case 發送流程

```
觸發（手動 / 排程）
       │
       ▼
從 Case 取得設定
  ├─ Google Sheet ID + Tab
  └─ 接收者列表 + 訊息模板
       │
       ▼
透過 Google Sheets API 讀取資料
       │
       ▼
套用訊息模板，產生每位接收者的訊息
  (支援 {{欄位名}} 變數替換)
       │
       ▼
透過 LINE Messaging API 逐一推播
       │
       ▼
寫入 SendLog（成功/失敗）
       │
       ▼
更新 Schedule.lastRunAt / nextRunAt
```

### 8.2 訊息模板範例

模板：
```
{{姓名}} 您好！
您本月的業績為 {{業績金額}} 元，
排名第 {{排名}} 名。
繼續加油！💪
```

Google Sheet 資料：
| 姓名 | 業績金額 | 排名 | LINE ID |
|------|---------|------|---------|
| 王小明 | 150,000 | 3 | U1234... |

產出訊息：
```
王小明 您好！
您本月的業績為 150,000 元，
排名第 3 名。
繼續加油！💪
```

---

## 9. 第三方服務設定需求

### 9.1 Google Cloud Platform

- 建立 GCP 專案
- 啟用 Google Sheets API
- 建立 Service Account 並下載金鑰 JSON
- 將 Service Account Email 加入 Google Sheet 的共用權限

### 9.2 LINE Developers

- 建立 LINE Messaging API Channel
- 取得 Channel Access Token（Long-lived）
- 取得 Channel Secret
- 設定 Webhook URL 指向 `/api/webhook/line`

### 9.3 環境變數

```env
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# Database
DATABASE_URL="file:./dev.db"          # SQLite (開發)
# DATABASE_URL="postgresql://..."     # PostgreSQL (正式)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. 開發階段規劃

### Phase 1：基礎建設（核心骨架）

- [ ] 專案初始化（Bun + Next.js + TypeScript + Tailwind + Prisma）
- [ ] 資料庫 Schema 建立與 Migration
- [ ] 基礎 Layout 與導覽列

### Phase 2：Google Sheet 整合

- [ ] Google Sheets API 串接
- [ ] Sheet 管理 CRUD（新增 / 列表 / 刪除）
- [ ] 工作表（Tab）列表與資料預覽

### Phase 3：LINE Bot 整合

- [ ] LINE Bot SDK 串接
- [ ] Webhook 端點（接收 follow/unfollow 事件）
- [ ] 好友名單同步與管理介面

### Phase 4：Case 核心功能

- [ ] Case CRUD API 與頁面
- [ ] 步驟式表單（Sheet 選擇 → 模板設定 → 好友選取）
- [ ] 訊息模板引擎（變數替換）
- [ ] 手動發送功能

### Phase 5：排程與自動化

- [ ] 排程 CRUD API
- [ ] Cron 排程器實作
- [ ] 排程管理 UI（CronBuilder）

### Phase 6：紀錄與監控

- [ ] 發送紀錄 API 與頁面
- [ ] Dashboard 統計資訊
- [ ] 錯誤處理與重試機制

---

## 11. 注意事項與限制

| 項目 | 說明 |
|------|------|
| LINE 推播限制 | 免費方案每月推播訊息數有上限，需注意用量 |
| Google Sheets API 配額 | 每分鐘 60 次請求（預設），大量資料需考慮分批 |
| 排程精度 | node-cron 精度為秒級，部署環境需確保常駐運行 |
| 資料隱私 | LINE User ID 與個人資料需妥善保管，符合隱私規範 |
| Service Account 權限 | Google Sheet 必須手動共用給 Service Account |
