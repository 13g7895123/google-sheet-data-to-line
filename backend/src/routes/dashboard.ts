import { Hono } from 'hono'
import { prisma } from '../lib/prisma'

export const dashboardRouter = new Hono()

// GET /api/dashboard/stats
dashboardRouter.get('/stats', async (c) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalCases, activeCaseCount, todayLogs, successCount, totalCount] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: 'ACTIVE' } }),
    prisma.sendLog.count({ where: { sentAt: { gte: today } } }),
    prisma.sendLog.count({ where: { status: 'SUCCESS' } }),
    prisma.sendLog.count(),
  ])

  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0

  return c.json({
    totalCases,
    todaySentCount: todayLogs,
    successRate,
    activeCaseCount,
  })
})
