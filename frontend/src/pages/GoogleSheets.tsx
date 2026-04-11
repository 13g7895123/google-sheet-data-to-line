import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ExternalLink, Trash2, X, Sheet } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import * as Dialog from '@radix-ui/react-dialog'
import { getSheets, addSheet, deleteSheet } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { GoogleSheet } from '@/types'

export function GoogleSheets() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<GoogleSheet | null>(null)

  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ['sheets'],
    queryFn: getSheets,
  })

  const addMutation = useMutation({
    mutationFn: () => addSheet(urlInput),
    onSuccess: (sheet) => {
      toast.success(`已新增：${sheet.name}`)
      void qc.invalidateQueries({ queryKey: ['sheets'] })
      setAddOpen(false)
      setUrlInput('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSheet(id),
    onSuccess: () => {
      toast.success('已刪除')
      void qc.invalidateQueries({ queryKey: ['sheets'] })
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus size={16} /> 新增
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !sheets.length ? (
        <EmptyState
          icon={<Sheet size={40} />}
          title="尚無 Google Sheet"
          description="新增 Spreadsheet 以開始設定 Case 的資料來源"
          action={
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> 新增
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sheets.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <Sheet size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {s.spreadsheetId}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>工作表：{s.tabs.length} 個</span>
                      <span>關聯 Case：{s.caseCount} 個</span>
                      <span>新增：{formatDate(s.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/google-sheets/${s.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink size={12} /> 查看
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 size={12} /> 刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold text-foreground">新增 Google Sheet</Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" aria-label="關閉">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="sheet-url">
                  Spreadsheet URL 或 ID <span className="text-destructive">*</span>
                </label>
                <input
                  id="sheet-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>請先將 Service Account 加入該 Sheet 的共用權限，系統才能讀取資料。</span>
              </div>

              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">取消</button>
                </Dialog.Close>
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={!urlInput.trim() || addMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {addMutation.isPending ? '新增中...' : '確認新增'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`確認刪除「${deleteTarget?.name}」？`}
        description={deleteTarget?.caseCount ? `此 Sheet 關聯了 ${deleteTarget.caseCount} 個 Case，刪除後這些 Case 將失去資料來源。` : undefined}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
