import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatShortDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

const DOW_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 將本系統產生的 cron 轉成中文易讀描述 */
export function describeCron(cronExpr: string): string {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return cronExpr
  const [minStr, hourStr, domStr, , dowStr] = parts
  const min = parseInt(minStr, 10)
  const hour = hourStr === '*' ? null : parseInt(hourStr, 10)
  const dom = domStr === '*' ? null : parseInt(domStr, 10)
  const dow = dowStr === '*' ? null : parseInt(dowStr, 10)
  const t = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  if (hour === null) return `每小時第 ${min} 分`
  if (dom === null && dow === null) return `每天 ${t(hour, min)}`
  if (dow !== null) return `每週${DOW_LABELS[dow]} ${t(hour, min)}`
  if (dom !== null) return `每月 ${dom} 日 ${t(hour, min)}`
  return cronExpr
}
