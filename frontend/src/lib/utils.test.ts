import { describe, it, expect } from 'vitest'
import { cn, truncate, describeCron, formatDate, formatShortDate } from '@/lib/utils'

// ─── cn ──────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('合併多個 class 字串', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('條件 class：false 不加入', () => {
    expect(cn('foo', false && 'bar')).toBe('foo')
  })

  it('tailwind 衝突以後者為主', () => {
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })
})

// ─── truncate ────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('超過最大長度時截斷並加 ...', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('等於最大長度不截斷', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('小於最大長度不截斷', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })

  it('空字串不受影響', () => {
    expect(truncate('', 5)).toBe('')
  })
})

// ─── describeCron ─────────────────────────────────────────────────────────────

describe('describeCron', () => {
  it('每小時排程：M * * * *', () => {
    expect(describeCron('30 * * * *')).toBe('每小時第 30 分')
    expect(describeCron('0 * * * *')).toBe('每小時第 0 分')
  })

  it('每天排程：M H * * *', () => {
    expect(describeCron('0 9 * * *')).toBe('每天 09:00')
    expect(describeCron('30 14 * * *')).toBe('每天 14:30')
    expect(describeCron('5 8 * * *')).toBe('每天 08:05')
  })

  it('每週排程：M H * * D（0=日, 1=一...6=六）', () => {
    expect(describeCron('0 9 * * 1')).toBe('每週一 09:00')
    expect(describeCron('30 18 * * 5')).toBe('每週五 18:30')
    expect(describeCron('0 10 * * 0')).toBe('每週日 10:00')
  })

  it('每月排程：M H Dom * *', () => {
    expect(describeCron('0 9 1 * *')).toBe('每月 1 日 09:00')
    expect(describeCron('30 12 15 * *')).toBe('每月 15 日 12:30')
  })

  it('不合法格式直接回傳原字串', () => {
    expect(describeCron('bad')).toBe('bad')
    expect(describeCron('')).toBe('')
  })
})

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('接受 string 格式並輸出 zh-TW 格式', () => {
    const result = formatDate('2026-04-11T09:00:00.000Z')
    // 只確認包含年月日數字，不強依賴時區
    expect(result).toMatch(/2026/)
  })

  it('接受 Date 物件', () => {
    const d = new Date('2026-01-01T00:00:00.000Z')
    expect(formatDate(d)).toMatch(/2026/)
  })
})

// ─── formatShortDate ─────────────────────────────────────────────────────────

describe('formatShortDate', () => {
  it('只顯示月日', () => {
    const result = formatShortDate('2026-04-11T09:00:00.000Z')
    expect(result).not.toMatch(/2026/) // 不含年份
  })
})
