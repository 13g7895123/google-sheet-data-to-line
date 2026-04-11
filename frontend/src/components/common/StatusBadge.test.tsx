import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/common/StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['DRAFT', '草稿'],
    ['ACTIVE', '啟用'],
    ['PAUSED', '暫停'],
    ['DONE', '完成'],
    ['SUCCESS', '成功'],
    ['FAILED', '失敗'],
  ] as const)('status=%s 顯示中文標籤 %s', (status, label) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('套用額外 className', () => {
    const { container } = render(<StatusBadge status="ACTIVE" className="extra-class" />)
    expect(container.firstChild).toHaveClass('extra-class')
  })
})
