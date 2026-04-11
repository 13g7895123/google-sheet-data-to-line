/**
 * 計算下一次 cron 排程的執行時間（支援本系統產生的 4 種固定格式）
 *
 * 支援的格式：
 *   M * * * *       — 每小時第 M 分
 *   M H * * *       — 每天 H:M
 *   M H * * D       — 每週第 D 天 H:M（D=0 日, 1 一 … 6 六）
 *   M H Dom * *     — 每月第 Dom 日 H:M
 */
export function calcNextRunAt(cronExpr: string, from: Date = new Date()): Date {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) {
    // fallback: 1 分鐘後
    return new Date(from.getTime() + 60_000)
  }

  const [minStr, hourStr, domStr, , dowStr] = parts
  const minute = parseInt(minStr, 10)
  const hour = hourStr === '*' ? null : parseInt(hourStr, 10)
  const dom = domStr === '*' ? null : parseInt(domStr, 10)
  const dow = dowStr === '*' ? null : parseInt(dowStr, 10)

  // ── 每小時 M * * * * ────────────────────────────────────────────
  if (hour === null && dom === null && dow === null) {
    const next = new Date(from)
    next.setSeconds(0, 0)
    if (next.getMinutes() >= minute) {
      next.setHours(next.getHours() + 1, minute, 0, 0)
    } else {
      next.setMinutes(minute, 0, 0)
    }
    if (next <= from) next.setHours(next.getHours() + 1)
    return next
  }

  // ── 每天 M H * * * ──────────────────────────────────────────────
  if (hour !== null && dom === null && dow === null) {
    const next = new Date(from)
    next.setHours(hour, minute, 0, 0)
    if (next <= from) {
      next.setDate(next.getDate() + 1)
      next.setHours(hour, minute, 0, 0)
    }
    return next
  }

  // ── 每週 M H * * D ──────────────────────────────────────────────
  if (hour !== null && dom === null && dow !== null) {
    const next = new Date(from)
    next.setHours(hour, minute, 0, 0)
    let daysToAdd = (dow - next.getDay() + 7) % 7
    if (daysToAdd === 0 && next <= from) daysToAdd = 7
    next.setDate(next.getDate() + daysToAdd)
    next.setHours(hour, minute, 0, 0)
    return next
  }

  // ── 每月 M H Dom * * ────────────────────────────────────────────
  if (hour !== null && dom !== null && dow === null) {
    const next = new Date(from)
    next.setDate(dom)
    next.setHours(hour, minute, 0, 0)
    if (next <= from) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(dom)
      next.setHours(hour, minute, 0, 0)
    }
    return next
  }

  return new Date(from.getTime() + 60_000)
}

/**
 * 根據 ScheduleInput 欄位建構 cron 表達式（與前端 CronBuilder 邏輯一致）
 */
export function buildCronExpression(opts: {
  frequency: string
  minute?: number
  hour?: number
  dayOfMonth?: number
  dayOfWeek?: number
}): string {
  const { frequency, minute = 0, hour = 9, dayOfMonth = 1, dayOfWeek = 1 } = opts
  switch (frequency) {
    case 'hourly':  return `${minute} * * * *`
    case 'daily':   return `${minute} ${hour} * * *`
    case 'weekly':  return `${minute} ${hour} * * ${dayOfWeek}`
    case 'monthly': return `${minute} ${hour} ${dayOfMonth} * *`
    default:        return `${minute} ${hour} * * *`
  }
}
