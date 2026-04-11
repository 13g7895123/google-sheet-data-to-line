import { useState, useEffect } from 'react'
import type { ScheduleInput } from '@/types'

interface CronBuilderProps {
  value: ScheduleInput
  onChange: (v: ScheduleInput) => void
}

function buildCron(input: ScheduleInput): string {
  const { frequency, minute = 0, hour = 9, dayOfMonth = 1, dayOfWeek = 1 } = input
  switch (frequency) {
    case 'hourly': return `${minute} * * * *`
    case 'daily': return `${minute} ${hour} * * *`
    case 'weekly': return `${minute} ${hour} * * ${dayOfWeek}`
    case 'monthly': return `${minute} ${hour} ${dayOfMonth} * *`
    default: return ''
  }
}

/** 計算 cron 表達式下一次觸發時間（前端版，支援本系統 4 種格式） */
function calcNextRunAt(cronExpr: string): Date | null {
  if (!cronExpr) return null
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return null

  const [minStr, hourStr, domStr, , dowStr] = parts
  const minute = parseInt(minStr, 10)
  const hour = hourStr === '*' ? null : parseInt(hourStr, 10)
  const dom = domStr === '*' ? null : parseInt(domStr, 10)
  const dow = dowStr === '*' ? null : parseInt(dowStr, 10)

  const now = new Date()

  if (hour === null && dom === null && dow === null) {
    // Hourly
    const next = new Date(now)
    next.setSeconds(0, 0)
    if (next.getMinutes() >= minute) {
      next.setHours(next.getHours() + 1, minute, 0, 0)
    } else {
      next.setMinutes(minute, 0, 0)
    }
    if (next <= now) next.setHours(next.getHours() + 1)
    return next
  }
  if (hour !== null && dom === null && dow === null) {
    // Daily
    const next = new Date(now)
    next.setHours(hour, minute, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }
  if (hour !== null && dom === null && dow !== null) {
    // Weekly
    const next = new Date(now)
    next.setHours(hour, minute, 0, 0)
    let daysToAdd = (dow - next.getDay() + 7) % 7
    if (daysToAdd === 0 && next <= now) daysToAdd = 7
    next.setDate(next.getDate() + daysToAdd)
    next.setHours(hour, minute, 0, 0)
    return next
  }
  if (hour !== null && dom !== null && dow === null) {
    // Monthly
    const next = new Date(now)
    next.setDate(dom)
    next.setHours(hour, minute, 0, 0)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(dom)
      next.setHours(hour, minute, 0, 0)
    }
    return next
  }

  return null
}

function formatNextRun(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1)
const DAYS_OF_WEEK = ['日', '一', '二', '三', '四', '五', '六']

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [cronExpr, setCronExpr] = useState('')
  const [nextRun, setNextRun] = useState<Date | null>(null)

  useEffect(() => {
    if (value.type === 'recurring') {
      const expr = buildCron(value)
      setCronExpr(expr)
      setNextRun(calcNextRunAt(expr))
      // 將 cronExpression 同步進 value，後端直接使用
      if (expr && expr !== value.cronExpression) {
        onChange({ ...value, cronExpression: expr })
      }
    } else {
      setCronExpr('')
      setNextRun(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.type, value.frequency, value.minute, value.hour, value.dayOfMonth, value.dayOfWeek])

  const update = (partial: Partial<ScheduleInput>) => {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="space-y-2">
        {(['none', 'once', 'recurring'] as const).map((type) => {
          const labels = { none: '不設排程（僅手動發送）', once: '單次排程', recurring: '週期排程' }
          return (
            <label key={type} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="schedule-type"
                value={type}
                checked={value.type === type}
                onChange={() => update({ type })}
                className="w-4 h-4 text-primary border-border focus:ring-primary"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {labels[type]}
              </span>
            </label>
          )
        })}
      </div>

      {/* Once */}
      {value.type === 'once' && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">─── 單次排程設定 ───</p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">執行日期時間</label>
            <input
              type="datetime-local"
              value={value.runOnce ?? ''}
              onChange={(e) => update({ runOnce: e.target.value })}
              className="h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="執行日期時間"
            />
          </div>
        </div>
      )}

      {/* Recurring */}
      {value.type === 'recurring' && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">─── 週期排程設定 ───</p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">頻率</label>
            <select
              value={value.frequency ?? 'daily'}
              onChange={(e) => update({ frequency: e.target.value as ScheduleInput['frequency'] })}
              className="h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="頻率"
            >
              <option value="hourly">每小時</option>
              <option value="daily">每天</option>
              <option value="weekly">每週</option>
              <option value="monthly">每月</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {value.frequency === 'monthly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">每月第</span>
                <select
                  value={value.dayOfMonth ?? 1}
                  onChange={(e) => update({ dayOfMonth: Number(e.target.value) })}
                  className="h-9 px-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="日期"
                >
                  {DAYS_OF_MONTH.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="text-sm text-muted-foreground">日，</span>
              </div>
            )}

            {value.frequency === 'weekly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">每週</span>
                <select
                  value={value.dayOfWeek ?? 1}
                  onChange={(e) => update({ dayOfWeek: Number(e.target.value) })}
                  className="h-9 px-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="星期"
                >
                  {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>星期{d}</option>)}
                </select>
                <span className="text-sm text-muted-foreground">，</span>
              </div>
            )}

            {value.frequency !== 'hourly' && (
              <div className="flex items-center gap-1">
                <select
                  value={value.hour ?? 9}
                  onChange={(e) => update({ hour: Number(e.target.value) })}
                  className="h-9 px-2 rounded-lg border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="時"
                >
                  {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                </select>
                <span className="text-sm text-muted-foreground">:</span>
                <select
                  value={value.minute ?? 0}
                  onChange={(e) => update({ minute: Number(e.target.value) })}
                  className="h-9 px-2 rounded-lg border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="分"
                >
                  {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
              </div>
            )}

            {value.frequency === 'hourly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">每小時第</span>
                <select
                  value={value.minute ?? 0}
                  onChange={(e) => update({ minute: Number(e.target.value) })}
                  className="h-9 px-2 rounded-lg border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="分鐘"
                >
                  {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
                <span className="text-sm text-muted-foreground">分</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">Cron 表達式：</span>
            <code className="text-xs font-mono bg-white border border-border px-2 py-1 rounded text-primary">
              {cronExpr || '—'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">下次執行：</span>
            <span className="text-xs font-medium text-foreground">{formatNextRun(nextRun)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
