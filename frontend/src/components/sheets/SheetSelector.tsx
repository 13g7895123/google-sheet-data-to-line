import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { getSheets, addSheet, getSheetPreview } from '@/lib/api'
import { SheetPreview } from './SheetPreview'
import type { SheetPreviewRow } from '@/types'

interface SheetSelectorProps {
  spreadsheetId?: string
  tabName?: string
  onSpreadsheetChange: (id: string, name: string) => void
  onTabChange: (tab: string, columns: string[]) => void
}

export function SheetSelector({ spreadsheetId, tabName, onSpreadsheetChange, onTabChange }: SheetSelectorProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [previewRows, setPreviewRows] = useState<SheetPreviewRow[]>([])
  const qc = useQueryClient()

  const { data: sheets = [] } = useQuery({
    queryKey: ['sheets'],
    queryFn: getSheets,
  })

  const selectedSheet = sheets.find((s) => s.spreadsheetId === spreadsheetId)

  const { data: previewData } = useQuery({
    queryKey: ['sheet-preview', spreadsheetId, tabName],
    queryFn: () => getSheetPreview(spreadsheetId!, tabName!),
    enabled: !!(spreadsheetId && tabName),
  })

  useEffect(() => {
    if (previewData) {
      setPreviewRows(previewData)
      const cols = previewData.length > 0 ? Object.keys(previewData[0]) : []
      onTabChange(tabName!, cols)
    }
  }, [previewData, tabName, onTabChange])

  const addMutation = useMutation({
    mutationFn: () => addSheet(urlInput),
    onSuccess: (sheet) => {
      toast.success(`已新增 Google Sheet：${sheet.name}`)
      void qc.invalidateQueries({ queryKey: ['sheets'] })
      setAddModalOpen(false)
      setUrlInput('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      {/* Spreadsheet selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          選擇 Google Sheet <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={spreadsheetId ?? ''}
            onChange={(e) => {
              const s = sheets.find((sh) => sh.spreadsheetId === e.target.value)
              if (s) onSpreadsheetChange(s.spreadsheetId, s.name)
            }}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="選擇 Spreadsheet"
          >
            <option value="">▼ 請選擇 Spreadsheet</option>
            {sheets.map((s) => (
              <option key={s.spreadsheetId} value={s.spreadsheetId}>{s.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus size={14} /> 新增
          </button>
        </div>
      </div>

      {/* Tab selector */}
      {selectedSheet && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            選擇工作表（Tab）<span className="text-destructive">*</span>
          </label>
          <select
            value={tabName ?? ''}
            onChange={(e) => {
              if (e.target.value) onTabChange(e.target.value, [])
            }}
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="選擇工作表"
          >
            <option value="">▼ 請選擇工作表</option>
            {selectedSheet.tabs.map((t) => (
              <option key={t.gid} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Preview */}
      {tabName && previewRows.length > 0 && (
        <SheetPreview rows={previewRows} />
      )}

      {/* Add Sheet Modal */}
      <Dialog.Root open={addModalOpen} onOpenChange={setAddModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-semibold">新增 Google Sheet</Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" aria-label="關閉">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Spreadsheet URL 或 ID <span className="text-destructive">*</span>
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>請先將 Service Account 加入該 Sheet 的共用權限</span>
              </div>

              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    取消
                  </button>
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
    </div>
  )
}
