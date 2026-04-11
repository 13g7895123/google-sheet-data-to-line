import cron from 'node-cron'
import { prisma } from './prisma'
import { sendCase } from './sender'
import { calcNextRunAt } from './cron-utils'

let started = false

export function startScheduler() {
  if (started) return
  started = true

  // 每分鐘檢查一次待執行的排程
  cron.schedule('* * * * *', async () => {
    const now = new Date()

    try {
      const schedules = await prisma.schedule.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
          case: { status: 'ACTIVE' },
        },
        include: { case: { select: { id: true, name: true } } },
      })

      if (schedules.length === 0) return

      console.log(`[Scheduler] ${schedules.length} schedule(s) due at ${now.toISOString()}`)

      for (const schedule of schedules) {
        try {
          console.log(`[Scheduler] Executing case "${schedule.case.name}" (schedule ${schedule.id})`)
          await sendCase(schedule.caseId, schedule.id)

          // 計算下次執行時間（週期排程）
          const nextRunAt =
            schedule.isRecurring && schedule.cronExpression
              ? calcNextRunAt(schedule.cronExpression, now)
              : null

          await prisma.schedule.update({
            where: { id: schedule.id },
            data: {
              lastRunAt: now,
              nextRunAt,
              // 單次排程執行後停用
              isActive: schedule.isRecurring,
            },
          })

          console.log(`[Scheduler] ✅ Done — next run: ${nextRunAt?.toISOString() ?? 'n/a'}`)
        } catch (err) {
          console.error(`[Scheduler] ❌ Failed to execute schedule ${schedule.id}:`, err)
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error querying schedules:', err)
    }
  })

  console.log('⏰ Scheduler started (checking every minute)')
}
