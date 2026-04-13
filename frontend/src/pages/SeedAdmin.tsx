import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sprout, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

interface Stats { lineFriends: number; googleSheets: number; cases: number; sendLogs: number }
interface SeedResult { ok: boolean; created: Stats }

const fetchStats = () => api.get<Stats>('/sadmin/stats').then((r) => r.data)
const seedData = () => api.post<SeedResult>('/sadmin/seed').then((r) => r.data)
const resetData = () => api.delete<{ ok: boolean; message: string }>('/sadmin/reset').then((r) => r.data)

const STAT_LABELS: { key: keyof Stats; label: string; color: string }[] = [
  { key: 'lineFriends', label: 'LINE 好友', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'googleSheets', label: 'Google Sheets', color: 'bg-blue-100 text-blue-700' },
  { key: 'cases', label: 'Cases', color: 'bg-violet-100 text-violet-700' },
  { key: 'sendLogs', label: '發送紀錄', color: 'bg-amber-100 text-amber-700' },
]

export function SeedAdmin() {
  const qc = useQueryClient()
  const [confirmReset, setConfirmReset] = useState(false)

  const { data: stats, isLoading } = useQuery({ queryKey: ['sadmin-stats'], queryFn: fetchStats })

  const seedMutation = useMutation({
    mutationFn: seedData,
    onSuccess: (res) => {
      const { created } = res
      toast.success(`建立完成：${created.lineFriends} 位好友、${created.cases} 個 Case、${created.sendLogs} 筆紀錄`)
      void qc.invalidateQueries({ queryKey: ['sadmin-stats'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const resetMutation = useMutation({
    mutationFn: resetData,
    onSuccess: () => {
      toast.success('所有資料已清除')
      setConfirmReset(false)
      void qc.invalidateQueries({ queryKey: ['sadmin-stats'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">測試資料管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          此頁面僅供開發/測試使用，建立或清除資料庫中的假資料。
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">目前資料量</h2>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['sadmin-stats'] })}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            aria-label="重新整理"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_LABELS.map(({ key, label, color }) => (
            <div key={key} className="rounded-lg border border-border p-3 text-center">
              <div className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${color}`}>
                {label}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? '—' : (stats?.[key] ?? 0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">操作</h2>

        {/* Seed */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <div>
            <p className="text-sm font-medium text-emerald-800">建立測試資料</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              新增 3 位 LINE 好友、1 個 Google Sheet、2 個 Case、3 筆發送紀錄
            </p>
          </div>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sprout size={14} />
            {seedMutation.isPending ? '建立中...' : '一鍵建立'}
          </button>
        </div>

        {/* Reset */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-red-50 border border-red-200">
          <div>
            <p className="text-sm font-medium text-red-800">清除所有資料</p>
            <p className="text-xs text-red-700 mt-0.5">
              刪除資料庫內所有記錄（不可復原）
            </p>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-red-700 font-medium">確定嗎？</span>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {resetMutation.isPending ? '清除中...' : '確認清除'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 size={14} />
              清除所有資料
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
