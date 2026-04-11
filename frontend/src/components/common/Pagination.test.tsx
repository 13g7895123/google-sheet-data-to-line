import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '@/components/common/Pagination'

describe('Pagination', () => {
  it('總頁數 <= 1 時不渲染', () => {
    const { container } = render(
      <Pagination page={1} total={5} pageSize={12} onPageChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('顯示所有頁碼（總頁數 <= 7）', () => {
    render(<Pagination page={1} total={30} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
  })

  it('當前頁按鈕具有 aria-current="page"', () => {
    render(<Pagination page={2} total={30} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it('點擊頁碼呼叫 onPageChange 並傳入正確頁數', () => {
    const mockChange = vi.fn()
    render(<Pagination page={1} total={30} pageSize={10} onPageChange={mockChange} />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(mockChange).toHaveBeenCalledWith(3)
  })

  it('點擊下一頁按鈕呼叫 onPageChange(page+1)', () => {
    const mockChange = vi.fn()
    render(<Pagination page={1} total={30} pageSize={10} onPageChange={mockChange} />)
    fireEvent.click(screen.getByRole('button', { name: '下一頁' }))
    expect(mockChange).toHaveBeenCalledWith(2)
  })

  it('點擊上一頁按鈕呼叫 onPageChange(page-1)', () => {
    const mockChange = vi.fn()
    render(<Pagination page={2} total={30} pageSize={10} onPageChange={mockChange} />)
    fireEvent.click(screen.getByRole('button', { name: '上一頁' }))
    expect(mockChange).toHaveBeenCalledWith(1)
  })

  it('在第一頁時上一頁按鈕為 disabled', () => {
    render(<Pagination page={1} total={30} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '上一頁' })).toBeDisabled()
  })

  it('在最後一頁時下一頁按鈕為 disabled', () => {
    render(<Pagination page={3} total={30} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '下一頁' })).toBeDisabled()
  })

  it('總頁數 > 7 時顯示省略符號', () => {
    render(<Pagination page={5} total={100} pageSize={10} onPageChange={() => {}} />)
    const ellipses = screen.getAllByText('...')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })
})
