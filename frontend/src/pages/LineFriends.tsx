import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { getLineFriends, syncLineFriends } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export function LineFriends() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 300)
  }

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['line-friends', debouncedSearch, page],
    queryFn: () => getLineFriends({ search: debouncedSearch || undefined, page, pageSize }),
  })

  const syncMutation = useMutation({
    mutationFn: syncLineFriends,
    onSuccess: () => {
      toast.success('好友名單同步完成')
      void qc.invalidateQueries({ queryKey: ['line-friends'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const friends = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-muted-foreground">
              上次同步：{formatDate(new Date(dataUpdatedAt))}
            </p>
          )}
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
          {syncMutation.isPending ? '同步中...' : '同步好友'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="輸入名稱搜尋..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="搜尋好友"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !friends.length ? (
          <EmptyState icon={<Users size={32} />} title="尚無好友" description="點擊「同步好友」以從 LINE 拉取好友名單" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-12">頭像</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">顯示名稱</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">狀態訊息</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">關聯 Case</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {friends.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    {f.pictureUrl ? (
                      <img src={f.pictureUrl} alt={f.displayName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {f.displayName[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{f.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">{f.statusMessage || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium text-foreground">{f.caseCount ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-primary hover:underline focus-visible:outline-none">
                      詳情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">共 {total} 位好友</p>
          </div>
        )}
      </div>

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  )
}
