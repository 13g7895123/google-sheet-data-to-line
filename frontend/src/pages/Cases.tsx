import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, FolderOpen } from 'lucide-react'
import { CaseCard } from '@/components/cases/CaseCard'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { getCases } from '@/lib/api'
import type { CaseStatus } from '@/types'

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: '全部狀態', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '啟用', value: 'ACTIVE' },
  { label: '暫停', value: 'PAUSED' },
  { label: '完成', value: 'DONE' },
]

export function Cases() {
  const [status, setStatus] = useState<CaseStatus | ''>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  // Debounce search
  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 300)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['cases', status, debouncedSearch, page],
    queryFn: () => getCases({ status: status || undefined, search: debouncedSearch || undefined, page, pageSize }),
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as CaseStatus | ''); setPage(1) }}
            className="h-9 px-3 pr-8 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            aria-label="狀態篩選"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="搜尋 Case 名稱..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-9 pl-8 pr-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring w-56"
              aria-label="搜尋"
            />
          </div>
        </div>

        <Link
          to="/cases/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus size={16} />
          新增 Case
        </Link>
      </div>

      {/* Grid */}
      {!isLoading && data?.total !== undefined && data.total > 0 && (
        <p className="text-xs text-muted-foreground">共 {data.total} 個 Case</p>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 h-48 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.data?.length ? (
        <EmptyState
          icon={<FolderOpen size={40} />}
          title="尚無 Case"
          description="點擊「新增 Case」開始建立您的第一個推播任務"
          action={
            <Link
              to="/cases/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> 新增 Case
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.data.map((c) => (
              <CaseCard key={c.id} case_={c} />
            ))}
          </div>
          <Pagination
            page={page}
            total={data.total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
