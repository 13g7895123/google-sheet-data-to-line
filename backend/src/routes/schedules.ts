import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import type { ScheduleRow } from '../lib/types'

type ScheduleWithCase = ScheduleRow & { case: { id: string; name: string } }

function formatSchedule(s: ScheduleWithCase) {
  return {
    id: s.id,
    caseId: s.caseId,
    caseName: s.case.name,
    type: s.isRecurring ? 'recurring' : 'once',
    cronExpression: s.cronExpression ?? undefined,
    nextRunAt: s.nextRunAt?.toISOString() ?? undefined,
    runOnce: s.scheduledAt?.toISOString() ?? undefined,
    status: s.isActive ? 'ACTIVE' : 'PAUSED',
  }
}

export const schedulesRouter = new Hono()

// GET /api/schedules
schedulesRouter.get('/', async (c) => {
  const status = c.req.query('status')
  const upcoming = c.req.query('upcoming') === 'true'
  const limit = Number(c.req.query('limit') ?? '100')

  const where: Record<string, unknown> = {}
  if (status === 'ACTIVE') where.isActive = true
  if (status === 'PAUSED') where.isActive = false
  if (upcoming) {
    where.isActive = true
    where.nextRunAt = { gte: new Date() }
  }

  const schedules = await prisma.schedule.findMany({
    where,
    take: limit,
    orderBy: upcoming ? { nextRunAt: 'asc' } : { createdAt: 'desc' },
    include: { case: { select: { id: true, name: true } } },
  })

  return c.json(schedules.map(formatSchedule))
})

// PATCH /api/schedules/:id
schedulesRouter.patch('/:id', async (c) => {
  const body = await c.req.json<{ status?: string }>()
  const isActive = body.status === 'ACTIVE'

  const schedule = await prisma.schedule.update({
    where: { id: c.req.param('id') },
    data: { isActive },
    include: { case: { select: { id: true, name: true } } },
  })

  return c.json(formatSchedule(schedule))
})

// DELETE /api/schedules/:id
schedulesRouter.delete('/:id', async (c) => {
  await prisma.schedule.delete({ where: { id: c.req.param('id') } })
  return c.json({ ok: true })
})
