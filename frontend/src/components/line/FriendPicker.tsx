import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getLineFriends, syncLineFriends } from '@/lib/api'
import type { LineFriend } from '@/types'

interface FriendPickerProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function FriendPicker({ selectedIds, onChange }: FriendPickerProps) {
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['line-friends'],
    queryFn: () => getLineFriends({ pageSize: 200 }),
  })

  const allFriends = data?.data ?? []
  const filtered = allFriends.filter((f) =>
    f.displayName.toLowerCase().includes(search.toLowerCase())
  )
  const selectedFriends = allFriends.filter((f) => selectedIds.includes(f.id))

  const toggle = (friend: LineFriend) => {
    if (selectedIds.includes(friend.id)) {
      onChange(selectedIds.filter((id) => id !== friend.id))
    } else {
      onChange([...selectedIds, friend.id])
    }
  }

  const selectAll = () => {
    const filteredIds = filtered.map((f) => f.id)
    const allSelected = filteredIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      onChange(selectedIds.filter((id) => !filteredIds.includes(id)))
    } else {
      const newIds = [...new Set([...selectedIds, ...filteredIds])]
      onChange(newIds)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncLineFriends()
      await refetch()
      toast.success('好友名單已同步')
    } catch {
      toast.error('同步失敗，請稍後再試')
    } finally {
      setSyncing(false)
    }
  }

  const allFiltered = filtered.every((f) => selectedIds.includes(f.id))

  return (
    <div className="space-y-3">
      {/* Search + sync */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="輸入名稱搜尋..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="搜尋好友"
          />
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {allFiltered ? '取消全選' : '☑ 全選'}
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="同步好友名單"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Friend list */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">LINE 好友列表</p>
          <div className="h-64 overflow-y-auto rounded-lg border border-border bg-white">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {search ? '找不到符合的好友' : '尚無好友'}
              </div>
            ) : (
              filtered.map((f) => {
                const checked = selectedIds.includes(f.id)
                return (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(f)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      aria-label={f.displayName}
                    />
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {f.displayName[0]}
                    </div>
                    <span className="text-sm text-foreground truncate">{f.displayName}</span>
                  </label>
                )
              })
            )}
          </div>
        </div>

        {/* Selected list */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">已選擇（{selectedFriends.length} 人）</p>
          <div className="h-64 overflow-y-auto rounded-lg border border-border bg-muted/30">
            {selectedFriends.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                尚未選擇
              </div>
            ) : (
              selectedFriends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {f.displayName[0]}
                  </div>
                  <span className="text-sm text-foreground flex-1 truncate">{f.displayName}</span>
                  <button
                    type="button"
                    onClick={() => toggle(f)}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    aria-label={`移除 ${f.displayName}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        共 {allFriends.length} 位好友 ｜ 已選 {selectedIds.length} 位
      </p>
    </div>
  )
}
