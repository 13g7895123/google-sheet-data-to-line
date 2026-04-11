import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Pencil, FileText, Trash2, Users, Clock, Sheet } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { deleteCase, sendCase } from '@/lib/api'
import type { Case } from '@/types'

interface CaseCardProps {
  case_: Case
}

export function CaseCard({ case_: c }: CaseCardProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmSend, setConfirmSend] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sendMutation = useMutation({
    mutationFn: () => sendCase(c.id),
    onSuccess: () => {
      toast.success(`已觸發 Case「${c.name}」發送`)
      setConfirmSend(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCase(c.id),
    onSuccess: () => {
      toast.success('Case 已刪除')
      void qc.invalidateQueries({ queryKey: ['cases'] })
      setConfirmDelete(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/cases/${c.id}`}
            className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1 hover:text-primary hover:underline"
          >
            {c.name}
          </Link>
          <StatusBadge status={c.status} className="shrink-0" />
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {c.sheetName && (
            <div className="flex items-center gap-1.5">
              <Sheet size={12} className="shrink-0" />
              <span className="truncate">{c.sheetName}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users size={12} className="shrink-0" />
            <span>接收者：{c.recipients.length} 人</span>
          </div>
          {c.schedule?.cronExpression && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="shrink-0" />
              <span className="truncate">{c.schedule.cronExpression}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setConfirmSend(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Send size={12} /> 發送
          </button>
          <button
            onClick={() => navigate(`/cases/${c.id}/edit`)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil size={12} /> 編輯
          </button>
          <button
            onClick={() => navigate(`/cases/${c.id}?tab=logs`)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileText size={12} /> 紀錄
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <Trash2 size={12} /> 刪除
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`確認立即發送「${c.name}」？`}
        description="此操作會立即向所有接收者發送 LINE 訊息。"
        confirmLabel="立即發送"
        onConfirm={() => sendMutation.mutate()}
        loading={sendMutation.isPending}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`確認刪除「${c.name}」？`}
        description="刪除後無法復原，相關排程也會一併停用。"
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
