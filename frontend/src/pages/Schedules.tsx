import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, Play, Pause, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { getSchedules, toggleSchedule, deleteSchedule } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import type { Schedule } from '@/types'

export function Schedules() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', statusFilter],
    queryFn: () => getSchedules({ status: statusFilter || undefined }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'PAUSED' }) =>
      toggleSchedule(id, status),
    onSuccess: () => {
      toast.success('排程狀態已更新')
      void qc.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      toast.success('排程已刪除')
      void qc.invalidateQueries({ queryKey: ['schedules'] })
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="狀態篩選"
        >
          <option value="">全部狀態</option>
          <option value="ACTIVE">啟用</option>
          <option value="PAUSED">停用</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !schedules.length ? (
          <EmptyState icon={<Clock size={32} />} title="尚無排程" description="在 Case 設定中新增排程" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">類型</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">排程</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">下次執行</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">狀態</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/cases/${s.caseId}`}
                      className="font-medium text-primary hover:underline focus-visible:outline-none"
                    >
                      {s.caseName ?? s.caseId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.type === 'recurring' ? '週期' : s.type === 'once' ? '單次' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {s.cronExpression
                      ? <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{s.cronExpression}</code>
                      : s.runOnce || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {s.nextRunAt ? formatDate(s.nextRunAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: s.id,
                            status: s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                          })
                        }
                        disabled={toggleMutation.isPending}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          s.status === 'ACTIVE'
                            ? 'text-amber-600 hover:bg-amber-50 border border-amber-200'
                            : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
                        )}
                        title={s.status === 'ACTIVE' ? '暫停' : '啟用'}
                        aria-label={s.status === 'ACTIVE' ? '暫停排程' : '啟用排程'}
                      >
                        {s.status === 'ACTIVE'
                          ? <Pause size={14} />
                          : <Play size={14} />
                        }
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-destructive/30 text-destructive hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="刪除排程"
                        aria-label="刪除排程"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="確認刪除排程？"
        description={`刪除後將停止自動執行。`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
