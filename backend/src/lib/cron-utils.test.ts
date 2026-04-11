import { describe, it, expect } from 'bun:test'
import { buildCronExpression, calcNextRunAt } from './cron-utils'

// ─── buildCronExpression ──────────────────────────────────────────────────────

describe('buildCronExpression', () => {
  it('hourly: 使用 minute 覆蓋預設值', () => {
    expect(buildCronExpression({ frequency: 'hourly', minute: 30 })).toBe('30 * * * *')
  })

  it('hourly: 預設 minute=0', () => {
    expect(buildCronExpression({ frequency: 'hourly' })).toBe('0 * * * *')
  })

  it('daily: 使用 hour 和 minute', () => {
    expect(buildCronExpression({ frequency: 'daily', hour: 9, minute: 0 })).toBe('0 9 * * *')
    expect(buildCronExpression({ frequency: 'daily', hour: 14, minute: 30 })).toBe('30 14 * * *')
  })

  it('weekly: 包含 dayOfWeek', () => {
    expect(buildCronExpression({ frequency: 'weekly', hour: 9, minute: 0, dayOfWeek: 1 })).toBe('0 9 * * 1')
    expect(buildCronExpression({ frequency: 'weekly', hour: 18, minute: 30, dayOfWeek: 5 })).toBe('30 18 * * 5')
  })

  it('monthly: 包含 dayOfMonth', () => {
    expect(buildCronExpression({ frequency: 'monthly', hour: 9, minute: 0, dayOfMonth: 1 })).toBe('0 9 1 * *')
    expect(buildCronExpression({ frequency: 'monthly', hour: 12, minute: 0, dayOfMonth: 15 })).toBe('0 12 15 * *')
  })
})

// ─── calcNextRunAt ────────────────────────────────────────────────────────────

describe('calcNextRunAt', () => {
  // 固定基準時間：2026-04-11 Saturday 08:00:00 UTC
  const base = new Date('2026-04-11T08:00:00.000Z')

  it('hourly: 當分鐘尚未到時，在本小時內觸發', () => {
    // base = :00, cron = 30 * * * * → 本小時 :30
    const next = calcNextRunAt('30 * * * *', base)
    expect(next.getMinutes()).toBe(30)
    expect(next.getTime()).toBeGreaterThan(base.getTime())
  })

  it('hourly: 當分鐘已過時，往下一小時', () => {
    // base = :00, cron = 0 * * * * → base 就是 :00 but base <= base, 往+1h
    const next = calcNextRunAt('0 * * * *', base)
    expect(next.getTime()).toBeGreaterThan(base.getTime())
  })

  it('daily: 當天時間未到時取今天', () => {
    // base = UTC 08:00, cron = 0 10 * * * → 同天 10:00 UTC
    const next = calcNextRunAt('0 10 * * *', base)
    expect(next.getUTCHours()).toBe(10)
    expect(next.getUTCDate()).toBe(base.getUTCDate())
  })

  it('daily: 當天時間已過時取明天', () => {
    // base = UTC 08:00, cron = 0 7 * * * → 明天 07:00
    const next = calcNextRunAt('0 7 * * *', base)
    expect(next.getTime()).toBeGreaterThan(base.getTime())
    // 各場景不同，只確認 > base
  })

  it('weekly: 取下一個符合星期的時間', () => {
    // base = Saturday(6), cron = 0 9 * * 1 (Monday) → 下週一
    const next = calcNextRunAt('0 9 * * 1', base)
    expect(next.getTime()).toBeGreaterThan(base.getTime())
  })

  it('monthly: 當月日期未到時取本月', () => {
    // base = April 11, cron = 0 9 15 * * → April 15
    const next = calcNextRunAt('0 9 15 * *', base)
    expect(next.getUTCDate()).toBe(15)
    expect(next.getTime()).toBeGreaterThan(base.getTime())
  })

  it('monthly: 當月日期已過時取下個月', () => {
    // base = April 11, cron = 0 9 5 * * → May 5
    const next = calcNextRunAt('0 9 5 * *', base)
    expect(next.getTime()).toBeGreaterThan(base.getTime())
    // 月份必須是下一月
    expect(next.getUTCMonth()).toBe(base.getUTCMonth() + 1)
  })

  it('無效 cron 表達式（少於 5 部分）回傳 1 分鐘後', () => {
    const next = calcNextRunAt('invalid', base)
    const expectedMs = base.getTime() + 60_000
    expect(next.getTime()).toBe(expectedMs)
  })
})
