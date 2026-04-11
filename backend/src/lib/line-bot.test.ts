import { describe, it, expect } from 'bun:test'
import { renderTemplate } from './line-bot'

describe('renderTemplate', () => {
  it('替換單一 {{key}} 佔位符', () => {
    const result = renderTemplate('您好，{{name}}！', { name: '小明' })
    expect(result).toBe('您好，小明！')
  })

  it('替換多個不同 {{key}}', () => {
    const result = renderTemplate(
      '親愛的 {{name}}，您的帳號 {{account}} 已更新',
      { name: '小華', account: 'A001' }
    )
    expect(result).toBe('親愛的 小華，您的帳號 A001 已更新')
  })

  it('相同 key 在模板出現多次都替換', () => {
    const result = renderTemplate('{{name}} 你好，{{name}}！', { name: '小李' })
    expect(result).toBe('小李 你好，小李！')
  })

  it('佔位符的 key 有前後空格也能正確替換', () => {
    const result = renderTemplate('數量：{{ amount }}', { amount: '100' })
    expect(result).toBe('數量：100')
  })

  it('找不到對應 key 時保留原始佔位符', () => {
    const result = renderTemplate('金額：{{total}}', { name: '小明' })
    expect(result).toBe('金額：{{total}}')
  })

  it('模板無任何佔位符時原樣回傳', () => {
    const result = renderTemplate('固定訊息，無任何變數', { name: '小明' })
    expect(result).toBe('固定訊息，無任何變數')
  })

  it('空模板回傳空字串', () => {
    expect(renderTemplate('', { name: 'X' })).toBe('')
  })

  it('空 row 資料時佔位符保留', () => {
    const result = renderTemplate('{{a}} {{b}}', {})
    expect(result).toBe('{{a}} {{b}}')
  })
})
