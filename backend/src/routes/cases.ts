import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { sendCase } from '../lib/sender'
import { buildCronExpression, calcNextRunAt } from '../lib/cron-utils'
import type { SendLogRow } from '../lib/types'

export const casesRouter = new Hono()

// ─── Shared schedule schema ───────────────────────────────────────────────────

const scheduleSchema = z.object({
  type: z.enum(['none', 'once', 'recurring']),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  minute: z.number().optional(),
  hour: z.number().optional(),
  dayOfMonth: z.number().optional(),
  dayOfWeek: z.number().optional(),
  cronExpression: z.string().optional(),
  runOnce: z.string().optional(),
})

function resolveScheduleCron(schedule: z.infer<typeof scheduleSchema>): {
  cronExpression: string | null
  scheduledAt: Date | null
  nextRunAt: Date | null
} {
  if (schedule.type === 'none') return { cronExpression: null, scheduledAt: null, nextRunAt: null }

  if (schedule.type === 'once') {
    const scheduledAt = schedule.runOnce ? new Date(schedule.runOnce) : null
    return { cronExpression: null, scheduledAt, nextRunAt: scheduledAt }
  }

  const cronExpr =
    schedule.cronExpression ??
    (schedule.frequency
      ? buildCronExpression({
          frequency: schedule.frequency,
          minute: schedule.minute,
          hour: schedule.hour,
          dayOfMonth: schedule.dayOfMonth,
          dayOfWeek: schedule.dayOfWeek,
        })
      : null)

  const nextRunAt = cronExpr ? calcNextRunAt(cronExpr) : null
  return { cronExpression: cronExpr, scheduledAt: null, nextRunAt }
}

// ─── GET /api/cases ───────────────────────────────────────────────────────────

casesRouter.get('/', async (c) => {
  const status = c.req.query('status')
  const search = c.req.query('search')
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '12')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) where.name = { contains: search }

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        googleSheet: true,
        sheetTab: true,
        recipients: { include: { lineFriend: true } },
        schedules: { where: { isActive: true }, take: 1 },
      },
    }),
    prisma.case.count({ where }),
  ])

  return c.json({ data: cases.map(formatCase), total, page, pageSize })
})

// ─── POST /api/cases ─────────────────────────────────────────────────────────

casesRouter.post('/', async (c) => {
  const body = await c.req.json()
  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    spreadsheetId: z.string().optional(),
    tabName: z.string().optional(),
    messageTemplate: z.string().optional(),
    recipientIds: z.array(z.string()).default([]),
    schedule: scheduleSchema.optional(),
  })

  const data = schema.parse(body)

  let googleSheetId: string | undefined
  let sheetTabId: string | undefined

  if (data.spreadsheetId && data.tabName) {
    const sheet = await prisma.googleSheet.findUnique({
      where: { spreadsheetId: data.spreadsheetId },
      include: { tabs: true },
    })
    if (sheet) {
      googleSheetId = sheet.id
      const tab = sheet.tabs.find((t) => t.sheetName === data.tabName)
      sheetTabId = tab?.id
    }
  }

  const scheduleData =
    data.schedule && data.schedule.type !== 'none'
      ? resolveScheduleCron(data.schedule)
      : null

  const case_ = await prisma.case.create({
    data: {
      name: data.name,
      description: data.description,
      googleSheetId: googleSheetId ?? null,
      sheetTabId: sheetTabId ?? null,
      messageTemplate: data.messageTemplate,
      status: 'DRAFT',
      recipients: {
        create: data.recipientIds.map((id: string) => ({ lineFriendId: id })),
      },
      ...(scheduleData
        ? {
            schedules: {
              create: {
                isRecurring: data.schedule!.type === 'recurring',
                cronExpression: scheduleData.cronExpression,
                scheduledAt: scheduleData.scheduledAt,
                nextRunAt: scheduleData.nextRunAt,
                isActive: true,
              },
            },
          }
        : {}),
    },
    include: {
      googleSheet: true,
      sheetTab: true,
      recipients: { include: { lineFriend: true } },
      schedules: { where: { isActive: true }, take: 1 },
    },
  })

  return c.json(formatCase(case_), 201)
})

// ─── GET /api/cases/:id ───────────────────────────────────────────────────────

casesRouter.get('/:id', async (c) => {
  const case_ = await prisma.case.findUniqueOrThrow({
    where: { id: c.req.param('id') },
    include: {
      googleSheet: true,
      sheetTab: true,
      recipients: { include: { lineFriend: true } },
      schedules: { where: { isActive: true }, take: 1 },
    },
  })
  return c.json(formatCase(case_))
})

// ─── PUT /api/cases/:id ───────────────────────────────────────────────────────

casesRouter.put('/:id', async (c) => {
  const caseId = c.req.param('id')
  const body = await c.req.json()
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    messageTemplate: z.string().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'DONE']).optional(),
    spreadsheetId: z.string().optional(),
    tabName: z.string().optional(),
    recipientIds: z.array(z.string()).optional(),
    schedule: scheduleSchema.optional(),
  })
  const data = schema.parse(body)

  // Resolve spreadsheetId → IDs
  let googleSheetId: string | null | undefined
  let sheetTabId: string | null | undefined

  if (data.spreadsheetId !== undefined) {
    if (data.spreadsheetId === '') {
      googleSheetId = null
      sheetTabId = null
    } else {
      const sheet = await prisma.googleSheet.findUnique({
        where: { spreadsheetId: data.spreadsheetId },
        include: { tabs: true },
      })
      if (sheet) {
        googleSheetId = sheet.id
        if (data.tabName) {
          const tab = sheet.tabs.find((t) => t.sheetName === data.tabName)
          sheetTabId = tab?.id ?? null
        }
      }
    }
  }

  const caseUpdate: Record<string, unknown> = {}
  if (data.name !== undefined) caseUpdate.name = data.name
  if (data.description !== undefined) caseUpdate.description = data.description
  if (data.messageTemplate !== undefined) caseUpdate.messageTemplate = data.messageTemplate
  if (data.status !== undefined) caseUpdate.status = data.status
  if (googleSheetId !== undefined) caseUpdate.googleSheetId = googleSheetId
  if (sheetTabId !== undefined) caseUpdate.sheetTabId = sheetTabId

  // Replace recipients
  if (data.recipientIds !== undefined) {
    await prisma.caseRecipient.deleteMany({ where: { caseId } })
    if (data.recipientIds.length > 0) {
      await prisma.caseRecipient.createMany({
        data: data.recipientIds.map((id) => ({ caseId, lineFriendId: id })),
        skipDuplicates: true,
      })
    }
  }

  // Replace schedule
  if (data.schedule !== undefined) {
    await prisma.schedule.updateMany({
      where: { caseId, isActive: true },
      data: { isActive: false },
    })
    if (data.schedule.type !== 'none') {
      const sd = resolveScheduleCron(data.schedule)
      await prisma.schedule.create({
        data: {
          caseId,
          isRecurring: data.schedule.type === 'recurring',
          cronExpression: sd.cronExpression,
          scheduledAt: sd.scheduledAt,
          nextRunAt: sd.nextRunAt,
          isActive: true,
        },
      })
    }
  }

  const case_ = await prisma.case.update({
    where: { id: caseId },
    data: caseUpdate,
    include: {
      googleSheet: true,
      sheetTab: true,
      recipients: { include: { lineFriend: true } },
      schedules: { where: { isActive: true }, take: 1 },
    },
  })

  return c.json(formatCase(case_))
})

// ─── DELETE /api/cases/:id ───────────────────────────────────────────────────

casesRouter.delete('/:id', async (c) => {
  await prisma.case.delete({ where: { id: c.req.param('id') } })
  return c.json({ ok: true })
})

// ─── POST /api/cases/:id/send ────────────────────────────────────────────────

casesRouter.post('/:id/send', async (c) => {
  const result = await sendCase(c.req.param('id'))
  return c.json({ ok: true, ...result })
})

// ─── GET /api/cases/:id/logs ─────────────────────────────────────────────────

casesRouter.get('/:id/logs', async (c) => {
  const caseId = c.req.param('id')
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '20')

  const [logs, total] = await Promise.all([
    prisma.sendLog.findMany({
      where: { caseId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { sentAt: 'desc' },
    }),
    prisma.sendLog.count({ where: { caseId } }),
  ])

  return c.json({ data: logs.map(formatLog), total, page, pageSize })
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

type LineFriendMinimal = {
  id: string
  lineUserId: string
  displayName: string
  pictureUrl: string | null
}
type RecipientWithFriend = { id: string; lineFriend: LineFriendMinimal }
type ScheduleMinimal = {
  id: string
  cronExpression: string | null
  nextRunAt: Date | null
  isActive: boolean
  isRecurring: boolean
}
type GoogleSheetMinimal = {
  id: string
  spreadsheetId: string
  spreadsheetName: string
}

type CaseWithRelations = Awaited<ReturnType<typeof prisma.case.findUniqueOrThrow>> & {
  googleSheet: GoogleSheetMinimal | null
  sheetTab: { sheetName: string } | null
  recipients: RecipientWithFriend[]
  schedules: ScheduleMinimal[]
}

function formatCase(c: CaseWithRelations) {
  const schedule = c.schedules[0]
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    status: c.status,
    sheetId: c.googleSheet?.id ?? undefined,
    sheetName: c.googleSheet?.spreadsheetName ?? undefined,
    spreadsheetId: c.googleSheet?.spreadsheetId ?? undefined,
    tabName: c.sheetTab?.sheetName ?? undefined,
    messageTemplate: c.messageTemplate ?? undefined,
    recipients: c.recipients.map((r: RecipientWithFriend) => ({
      id: r.lineFriend.id,
      userId: r.lineFriend.lineUserId,
      displayName: r.lineFriend.displayName,
      pictureUrl: r.lineFriend.pictureUrl ?? undefined,
    })),
    schedule: schedule
      ? {
          id: schedule.id,
          type: schedule.isRecurring ? ('recurring' as const) : ('once' as const),
          cronExpression: schedule.cronExpression ?? undefined,
          nextRunAt: schedule.nextRunAt?.toISOString() ?? undefined,
          status: (schedule.isActive ? 'ACTIVE' : 'PAUSED') as 'ACTIVE' | 'PAUSED',
        }
      : undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

function formatLog(l: SendLogRow) {
  return {
    id: l.id,
    caseId: l.caseId,
    recipientId: l.lineUserId,
    recipientName: l.recipientName,
    status: l.status,
    messagePreview: l.messageContent.slice(0, 80),
    errorMessage: l.errorMessage ?? undefined,
    sentAt: l.sentAt.toISOString(),
  }
}
