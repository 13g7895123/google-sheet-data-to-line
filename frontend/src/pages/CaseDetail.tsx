import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Send, Trash2, Users, Clock, FileText, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SendLogTable } from '@/components/logs/SendLogTable'
import { getCase, deleteCase, sendCase, patchCaseStatus } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { CaseStatus } from '@/types'

const TABS = [
  { id: 'overview', label: '概覽', icon: LayoutDashboard },
  { id: 'recipients', label: '接收者', icon: Users },
  { id: 'schedules', label: '排程', icon: Clock },
  { id: 'logs', label: '發送紀錄', icon: FileText },
]

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'

  const [confirmSend, setConfirmSend] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: c, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => getCase(id!),
    enabled: !!id,
  })

  const sendMutation = useMutation({
    mutationFn: () => sendCase(id!),
    onSuccess: () => { toast.success('發送已觸發'); setConfirmSend(false) },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCase(id!),
    onSuccess: () => {
      toast.success('Case 已刪除')
      void qc.invalidateQueries({ queryKey: ['cases'] })
      navigate('/cases')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const statusMutation = useMutation({
    mutationFn: (status: CaseStatus) => patchCaseStatus(id!, status),
    onSuccess: (updated) => {
      const labels: Record<CaseStatus, string> = { DRAFT: '草稿', ACTIVE: '啟用', PAUSED: '暫停', DONE: '完成' }
      toast.success(`Case 狀態已更新為「${labels[updated.status]}」`)
      void qc.invalidateQueries({ queryKey: ['case', id] })
      void qc.invalidateQueries({ queryKey: ['cases'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!c) return null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/cases"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="返回列表"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{c.name}</h1>
              <StatusBadge status={c.status} />
            </div>
            {c.description && <p className="text-sm text-muted-foreground mt-0.5">{c.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector */}
          <select
            value={c.status}
            onChange={(e) => statusMutation.mutate(e.target.value as CaseStatus)}
            disabled={statusMutation.isPending}
            className="h-9 px-3 rounded-lg border border-border bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 cursor-pointer"
            aria-label="切換 Case 狀態"
          >
            <option value="DRAFT">草稿</option>
            <option value="ACTIVE">啟用</option>
            <option value="PAUSED">暫停</option>
            <option value="DONE">完成</option>
          </select>

          <Link
            to={`/cases/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil size={14} /> 編輯
          </Link>
          <button
            onClick={() => setConfirmSend(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Send size={14} /> 發送
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-sm font-medium text-destructive hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 size={14} /> 刪除
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 -mb-px">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setSearchParams({ tab: tabId })}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none',
                activeTab === tabId
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
              aria-selected={activeTab === tabId}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">基本資訊</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">名稱</dt><dd className="text-foreground">{c.name}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">描述</dt><dd className="text-foreground">{c.description || '—'}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">狀態</dt><dd><StatusBadge status={c.status} /></dd></div>
              </dl>
            </div>
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">資料來源</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">Sheet</dt><dd className="text-foreground">{c.sheetName || '—'}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">工作表</dt><dd className="text-foreground">{c.tabName || '—'}</dd></div>
              </dl>
            </div>
            {c.messageTemplate && (
              <div className="md:col-span-2 bg-white rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">訊息模板</h3>
                <pre className="text-sm text-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap font-sans">
                  {c.messageTemplate}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipients' && (
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">接收者列表（{c.recipients.length} 人）</h3>
            </div>
            <div className="divide-y divide-border">
              {c.recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {r.displayName[0]}
                  </div>
                  <span className="text-sm text-foreground">{r.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">排程設定</h3>
            {c.schedule ? (
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-24 shrink-0">類型</dt>
                  <dd className="text-foreground">{{ none: '不設排程', once: '單次排程', recurring: '週期排程' }[c.schedule.type]}</dd>
                </div>
                {c.schedule.cronExpression && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-24 shrink-0">Cron</dt>
                    <dd><code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-primary">{c.schedule.cronExpression}</code></dd>
                  </div>
                )}
                {c.schedule.nextRunAt && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-24 shrink-0">下次執行</dt>
                    <dd className="text-foreground">{formatDate(c.schedule.nextRunAt)}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">未設定排程</p>
            )}
          </div>
        )}

        {activeTab === 'logs' && id && (
          <SendLogTable caseId={id} />
        )}
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
    </div>
  )
}
