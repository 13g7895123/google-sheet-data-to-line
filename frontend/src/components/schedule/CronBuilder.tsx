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

function nextRunTime(cronExpr: string): string {
  // Simple approximation; real calc would use a cron library
  if (!cronExpr) return '—'
  return '計算中...'
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1)
const DAYS_OF_WEEK = ['日', '一', '二', '三', '四', '五', '六']

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [cronExpr, setCronExpr] = useState('')

  useEffect(() => {
    if (value.type === 'recurring') {
      setCronExpr(buildCron(value))
    }
  }, [value])

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

          {/* Frequency */}
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

          {/* Time pickers */}
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

          {/* Cron expression */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">Cron 表達式：</span>
            <code className="text-xs font-mono bg-white border border-border px-2 py-1 rounded text-primary">
              {cronExpr || '—'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">下次執行：</span>
            <span className="text-xs text-foreground">{nextRunTime(cronExpr)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
