import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import type { SendLogRow } from '../lib/types'

type LogWithCase = SendLogRow & { case: { name: string } }

function formatLog(l: LogWithCase) {
  return {
    id: l.id,
    caseId: l.caseId,
    caseName: l.case.name,
    recipientId: l.lineUserId,
    recipientName: l.recipientName,
    status: l.status,
    messagePreview: l.messageContent.slice(0, 80),
    errorMessage: l.errorMessage ?? undefined,
    sentAt: l.sentAt.toISOString(),
  }
}

export const logsRouter = new Hono()

// GET /api/logs
logsRouter.get('/', async (c) => {
  const caseId = c.req.query('caseId')
  const status = c.req.query('status')
  const from = c.req.query('from')
  const to = c.req.query('to')
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '20')
  const limit = c.req.query('limit')

  const take = limit ? Number(limit) : pageSize

  const where: Record<string, unknown> = {}
  if (caseId) where.caseId = caseId
  if (status) where.status = status
  if (from || to) {
    where.sentAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    }
  }

  const [logs, total] = await Promise.all([
    prisma.sendLog.findMany({
      where,
      skip: limit ? 0 : (page - 1) * pageSize,
      take,
      orderBy: { sentAt: 'desc' },
      include: { case: { select: { name: true } } },
    }),
    prisma.sendLog.count({ where }),
  ])

  return c.json({
    data: logs.map(formatLog),
    total,
    page,
    pageSize,
  })
})
