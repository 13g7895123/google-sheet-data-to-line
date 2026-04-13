import { Hono } from 'hono'
import { prisma } from '../lib/prisma'

export const sadminRouter = new Hono()

// GET /api/sadmin/stats — 各資料表數量
sadminRouter.get('/stats', async (c) => {
  const [lineFriends, googleSheets, cases, sendLogs] = await Promise.all([
    prisma.lineFriend.count(),
    prisma.googleSheet.count(),
    prisma.case.count(),
    prisma.sendLog.count(),
  ])
  return c.json({ lineFriends, googleSheets, cases, sendLogs })
})

// POST /api/sadmin/seed — 建立測試資料
sadminRouter.post('/seed', async (c) => {
  // ── LINE 好友 ──────────────────────────────────────────────────────────────
  const friends = await Promise.all([
    prisma.lineFriend.upsert({
      where: { lineUserId: 'test_user_001' },
      update: {},
      create: { lineUserId: 'test_user_001', displayName: '測試用戶 Alice', statusMessage: '測試帳號 A' },
    }),
    prisma.lineFriend.upsert({
      where: { lineUserId: 'test_user_002' },
      update: {},
      create: { lineUserId: 'test_user_002', displayName: '測試用戶 Bob', statusMessage: '測試帳號 B' },
    }),
    prisma.lineFriend.upsert({
      where: { lineUserId: 'test_user_003' },
      update: {},
      create: { lineUserId: 'test_user_003', displayName: '測試用戶 Carol' },
    }),
  ])

  // ── Google Sheet ───────────────────────────────────────────────────────────
  const existingSheet = await prisma.googleSheet.findUnique({
    where: { spreadsheetId: 'test_spreadsheet_001' },
    include: { tabs: true },
  })

  const sheet = existingSheet ?? await prisma.googleSheet.create({
    data: {
      spreadsheetId: 'test_spreadsheet_001',
      spreadsheetName: '測試資料表',
      tabs: {
        create: [
          { sheetName: '用戶清單', gid: '0' },
          { sheetName: '活動報名', gid: '1' },
        ],
      },
    },
    include: { tabs: true },
  })

  const tab = sheet.tabs[0]

  // ── Cases ──────────────────────────────────────────────────────────────────
  const activeCase = await prisma.case.create({
    data: {
      name: '測試推播 — 每日活動通知',
      description: '測試用的啟用推播設定',
      status: 'ACTIVE',
      googleSheetId: sheet.id,
      sheetTabId: tab.id,
      messageTemplate: '嗨 {name}，今日活動：{event}，時間：{time}',
      recipients: {
        create: friends.map((f) => ({ lineFriendId: f.id })),
      },
    },
  })

  await prisma.case.create({
    data: {
      name: '測試推播 — 草稿',
      description: '尚未啟用的草稿 Case',
      status: 'DRAFT',
      messageTemplate: '您好 {name}，{message}',
      recipients: {
        create: [{ lineFriendId: friends[0].id }],
      },
    },
  })

  // ── 發送紀錄 ───────────────────────────────────────────────────────────────
  const now = new Date()
  await prisma.sendLog.createMany({
    data: friends.map((f, i) => ({
      caseId: activeCase.id,
      lineUserId: f.lineUserId,
      recipientName: f.displayName,
      messageContent: `嗨 ${f.displayName}，今日活動：測試活動，時間：14:00`,
      status: i < 2 ? 'SUCCESS' : 'FAILED',
      errorMessage: i >= 2 ? '這是模擬的錯誤訊息' : null,
      sentAt: new Date(now.getTime() - i * 3_600_000),
    })),
  })

  return c.json({
    ok: true,
    created: { lineFriends: friends.length, googleSheets: 1, cases: 2, sendLogs: friends.length },
  })
})

// DELETE /api/sadmin/reset — 清除所有資料
sadminRouter.delete('/reset', async (c) => {
  await prisma.sendLog.deleteMany()
  await prisma.caseRecipient.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.case.deleteMany()
  await prisma.sheetTab.deleteMany()
  await prisma.googleSheet.deleteMany()
  await prisma.lineFriend.deleteMany()
  return c.json({ ok: true, message: '所有資料已清除' })
})
