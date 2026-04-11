import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { testConnection as testGoogle } from '../lib/google-sheets'
import { testConnection as testLine } from '../lib/line-bot'

export const settingsRouter = new Hono()

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

// GET /api/settings
settingsRouter.get('/', async (c) => {
  const s = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

  const hasGoogle = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || s.googleServiceAccountEmail)
  const hasLine = !!(process.env.LINE_CHANNEL_ACCESS_TOKEN || s.lineChannelAccessToken)

  return c.json({
    googleServiceAccountEmail: s.googleServiceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    googlePrivateKey: (s.googlePrivateKey || process.env.GOOGLE_PRIVATE_KEY) ? '••••••••' : '',
    googleConnectionStatus: hasGoogle ? 'connected' : 'unknown',
    lineChannelAccessToken: (s.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN) ? '••••••••' : '',
    lineChannelSecret: (s.lineChannelSecret || process.env.LINE_CHANNEL_SECRET) ? '••••••••' : '',
    lineWebhookUrl: `${APP_URL}/api/webhook/line`,
    lineConnectionStatus: hasLine ? 'connected' : 'unknown',
  })
})

// PUT /api/settings
settingsRouter.put('/', async (c) => {
  const body = await c.req.json()
  const schema = z.object({
    googleServiceAccountEmail: z.string().optional(),
    googlePrivateKey: z.string().optional(),
    lineChannelAccessToken: z.string().optional(),
    lineChannelSecret: z.string().optional(),
  })
  const data = schema.parse(body)

  // Filter out masked placeholders
  const update: Record<string, string> = {}
  if (data.googleServiceAccountEmail !== undefined) update.googleServiceAccountEmail = data.googleServiceAccountEmail
  if (data.googlePrivateKey && data.googlePrivateKey !== '••••••••') update.googlePrivateKey = data.googlePrivateKey
  if (data.lineChannelAccessToken && data.lineChannelAccessToken !== '••••••••') update.lineChannelAccessToken = data.lineChannelAccessToken
  if (data.lineChannelSecret && data.lineChannelSecret !== '••••••••') update.lineChannelSecret = data.lineChannelSecret

  await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...update },
    update,
  })

  // 同步更新 process.env 使設定立即生效（無需重啟）
  if (update.googleServiceAccountEmail) process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = update.googleServiceAccountEmail
  if (update.googlePrivateKey) process.env.GOOGLE_PRIVATE_KEY = update.googlePrivateKey
  if (update.lineChannelAccessToken) process.env.LINE_CHANNEL_ACCESS_TOKEN = update.lineChannelAccessToken
  if (update.lineChannelSecret) process.env.LINE_CHANNEL_SECRET = update.lineChannelSecret

  return c.json({ ok: true })
})

// POST /api/settings/test-google
settingsRouter.post('/test-google', async (c) => {
  const ok = await testGoogle()
  return c.json({ connected: ok })
})

// POST /api/settings/test-line
settingsRouter.post('/test-line', async (c) => {
  const ok = await testLine()
  return c.json({ connected: ok })
})
