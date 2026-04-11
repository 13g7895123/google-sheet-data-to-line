import app from './src/app'
import { prisma } from './src/lib/prisma'
import { startScheduler } from './src/lib/scheduler'

// ── 啟動時從 DB 載入設定到 process.env（允許透過 UI 設定並立即生效）────────
async function loadSettingsFromDB() {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 'singleton' } })
    if (!s) return

    if (s.googleServiceAccountEmail && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = s.googleServiceAccountEmail
    }
    if (s.googlePrivateKey && !process.env.GOOGLE_PRIVATE_KEY) {
      process.env.GOOGLE_PRIVATE_KEY = s.googlePrivateKey
    }
    if (s.lineChannelAccessToken && !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = s.lineChannelAccessToken
    }
    if (s.lineChannelSecret && !process.env.LINE_CHANNEL_SECRET) {
      process.env.LINE_CHANNEL_SECRET = s.lineChannelSecret
    }
  } catch (err) {
    console.warn('[Startup] Could not load settings from DB:', err)
  }
}

await loadSettingsFromDB()
startScheduler()

const port = Number(process.env.PORT ?? 3000)
console.log(`🚀 Server running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
