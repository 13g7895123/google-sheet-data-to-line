import { Hono } from 'hono'
import { webhook } from '@line/bot-sdk'
import { prisma } from '../lib/prisma'
import { syncFriends, handleWebhookEvent, testConnection } from '../lib/line-bot'
import type { FriendRow } from '../lib/types'

type FriendWithCount = FriendRow & { _count: { recipients: number } }

function formatFriend(f: FriendWithCount) {
  return {
    id: f.id,
    userId: f.lineUserId,
    displayName: f.displayName,
    pictureUrl: f.pictureUrl ?? undefined,
    statusMessage: f.statusMessage ?? undefined,
    caseCount: f._count.recipients,
  }
}

export const lineRouter = new Hono()

// GET /api/line/friends
lineRouter.get('/friends', async (c) => {
  const search = c.req.query('search')
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '20')

  const where = search
    ? { displayName: { contains: search } }
    : {}

  const [friends, total] = await Promise.all([
    prisma.lineFriend.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { displayName: 'asc' },
      include: { _count: { select: { recipients: true } } },
    }),
    prisma.lineFriend.count({ where }),
  ])

  return c.json({
    data: friends.map(formatFriend),
    total,
    page,
    pageSize,
  })
})

// POST /api/line/friends/sync
lineRouter.post('/friends/sync', async (c) => {
  const count = await syncFriends()
  return c.json({ message: '同步完成', count })
})

// GET /api/line/friends/:id
lineRouter.get('/friends/:id', async (c) => {
  const friend = await prisma.lineFriend.findUniqueOrThrow({
    where: { id: c.req.param('id') },
    include: { _count: { select: { recipients: true } } },
  })

  return c.json(formatFriend(friend))
})

// POST /api/webhook/line
lineRouter.post('/webhook', async (c) => {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    return c.json({ message: 'LINE Channel Secret 未設定' }, 500)
  }

  const body = await c.req.text()
  const signature = c.req.header('x-line-signature') ?? ''

  // Signature validation
  const crypto = await import('crypto')
  const expectedSig = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64')

  if (signature !== expectedSig) {
    return c.json({ message: 'Invalid signature' }, 401)
  }

  const parsed = JSON.parse(body) as { events: webhook.Event[] }
  for (const event of parsed.events) {
    await handleWebhookEvent(event)
  }

  return c.json({ ok: true })
})

// POST /api/line/test
lineRouter.post('/test', async (c) => {
  const ok = await testConnection()
  return c.json({ connected: ok })
})
