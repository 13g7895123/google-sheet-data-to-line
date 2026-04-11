import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { SheetSelector } from '@/components/sheets/SheetSelector'
import { MessageTemplateEditor } from '@/components/message/MessageTemplateEditor'
import { FriendPicker } from '@/components/line/FriendPicker'
import { CronBuilder } from '@/components/schedule/CronBuilder'
import { createCase, updateCase, getCase } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CaseFormData, ScheduleInput, SheetPreviewRow } from '@/types'

const STEPS = [
  '基本資訊',
  '資料來源',
  '訊息模板',
  '選擇接收者',
  '排程設定',
  '確認建立',
]

const defaultSchedule: ScheduleInput = { type: 'none', frequency: 'monthly', hour: 9, minute: 0, dayOfMonth: 1 }

interface FormState {
  name: string
  description: string
  spreadsheetId: string
  spreadsheetName: string
  tabName: string
  columns: string[]
  previewRows: SheetPreviewRow[]
  messageTemplate: string
  recipientIds: string[]
  schedule: ScheduleInput
}

const initialState: FormState = {
  name: '',
  description: '',
  spreadsheetId: '',
  spreadsheetName: '',
  tabName: '',
  columns: [],
  previewRows: [],
  messageTemplate: '',
  recipientIds: [],
  schedule: defaultSchedule,
}

/** 將 cronExpression 反解析回 ScheduleInput 視覺欄位 */
function parseCronToInput(cronExpr: string): Partial<ScheduleInput> {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return {}
  const [minStr, hourStr, domStr, , dowStr] = parts
  const minute = parseInt(minStr, 10)
  const hour = hourStr === '*' ? undefined : parseInt(hourStr, 10)
  const dom = domStr === '*' ? undefined : parseInt(domStr, 10)
  const dow = dowStr === '*' ? undefined : parseInt(dowStr, 10)

  if (hour === undefined) return { frequency: 'hourly', minute }
  if (dom === undefined && dow === undefined) return { frequency: 'daily', hour, minute }
  if (dow !== undefined) return { frequency: 'weekly', hour, minute, dayOfWeek: dow }
  return { frequency: 'monthly', hour, minute, dayOfMonth: dom }
}

export function CaseForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [initialized, setInitialized] = useState(false)

  // 編輯模式：載入既有 case 資料
  const { data: existingCase, isLoading: caseLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => getCase(id!),
    enabled: isEditMode,
  })

  // 將既有資料填入表單（只執行一次）
  useEffect(() => {
    if (!isEditMode || !existingCase || initialized) return

    const schedule = existingCase.schedule
    let scheduleInput: ScheduleInput = defaultSchedule

    if (schedule) {
      if (schedule.type === 'once') {
        scheduleInput = { type: 'once', runOnce: schedule.runOnce ?? '' }
      } else if (schedule.type === 'recurring' && schedule.cronExpression) {
        const parsed = parseCronToInput(schedule.cronExpression)
        scheduleInput = {
          type: 'recurring',
          frequency: parsed.frequency ?? 'daily',
          hour: parsed.hour ?? 9,
          minute: parsed.minute ?? 0,
          dayOfMonth: parsed.dayOfMonth ?? 1,
          dayOfWeek: parsed.dayOfWeek ?? 1,
          cronExpression: schedule.cronExpression,
        }
      }
    }

    setForm({
      name: existingCase.name,
      description: existingCase.description ?? '',
      spreadsheetId: existingCase.spreadsheetId ?? '',
      spreadsheetName: existingCase.sheetName ?? '',
      tabName: existingCase.tabName ?? '',
      columns: [],
      previewRows: [],
      messageTemplate: existingCase.messageTemplate ?? '',
      recipientIds: existingCase.recipients.map((r) => r.id),
      schedule: scheduleInput,
    })
    setInitialized(true)
  }, [existingCase, isEditMode, initialized])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validateStep = (s: number): boolean => {
    const newErrors: typeof errors = {}
    if (s === 0) {
      if (!form.name.trim()) newErrors.name = 'Case 名稱不可為空'
      else if (form.name.length > 100) newErrors.name = '名稱最長 100 字'
    }
    if (s === 1) {
      if (!form.spreadsheetId) newErrors.spreadsheetId = '請選擇 Spreadsheet'
      if (!form.tabName) newErrors.tabName = '請選擇工作表'
    }
    if (s === 2) {
      if (!form.messageTemplate.trim()) newErrors.messageTemplate = '請輸入訊息模板'
    }
    if (s === 3) {
      if (form.recipientIds.length === 0) newErrors.recipientIds = '請至少選擇一位接收者'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => s + 1)
  }

  const prevStep = () => setStep((s) => s - 1)

  const buildPayload = (): CaseFormData => ({
    name: form.name,
    description: form.description || undefined,
    spreadsheetId: form.spreadsheetId,
    tabName: form.tabName,
    messageTemplate: form.messageTemplate,
    recipientIds: form.recipientIds,
    schedule: form.schedule.type !== 'none' ? form.schedule : undefined,
  })

  const createMutation = useMutation({
    mutationFn: () => createCase(buildPayload()),
    onSuccess: (created) => {
      toast.success('Case 建立成功！')
      void qc.invalidateQueries({ queryKey: ['cases'] })
      navigate(`/cases/${created.id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateCase(id!, buildPayload()),
    onSuccess: (updated) => {
      toast.success('Case 已更新')
      void qc.invalidateQueries({ queryKey: ['cases'] })
      void qc.invalidateQueries({ queryKey: ['case', id] })
      navigate(`/cases/${updated.id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    if (isEditMode) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const handleSaveAsDraft = () => {
    if (isEditMode) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const confirmLabel = isEditMode ? '儲存變更' : '建立'
  const draftLabel = isEditMode ? '取消' : '儲存為草稿'

  // 編輯模式載入中
  if (isEditMode && caseLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-base font-semibold text-foreground">
          {isEditMode ? `編輯 Case：${existingCase?.name ?? ''}` : '新增 Case'}
        </h1>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all shrink-0',
                  i < step
                    ? 'bg-primary border-primary text-white cursor-pointer hover:bg-blue-700'
                    : i === step
                    ? 'bg-white border-primary text-primary'
                    : 'bg-white border-border text-muted-foreground cursor-default'
                )}
                aria-label={label}
                aria-current={i === step ? 'step' : undefined}
                disabled={i > step}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1 transition-colors',
                  i < step ? 'bg-primary' : 'bg-border'
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex mt-2">
          {STEPS.map((label, i) => (
            <div key={i} className={cn('flex-1 text-xs text-center', i === STEPS.length - 1 && 'flex-none w-8')}>
              {i === step && <span className="font-medium text-primary">{label}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-5">
          Step {step + 1}/{STEPS.length} — {STEPS[step]}
        </h2>

        {/* Step 1: Basic info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="case-name">
                Case 名稱 <span className="text-destructive">*</span>
              </label>
              <input
                id="case-name"
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="例如：2026年4月業績通知"
                maxLength={100}
                className={cn(
                  'w-full h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                  errors.name ? 'border-destructive' : 'border-border'
                )}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && <p id="name-error" className="text-xs text-destructive mt-1" role="alert">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="case-desc">
                描述（選填）
              </label>
              <textarea
                id="case-desc"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{form.description.length}/500</p>
            </div>
          </div>
        )}

        {/* Step 2: Sheet */}
        {step === 1 && (
          <div>
            <SheetSelector
              spreadsheetId={form.spreadsheetId}
              tabName={form.tabName}
              onSpreadsheetChange={(sheetSpreadsheetId, name) => {
                update('spreadsheetId', sheetSpreadsheetId)
                update('spreadsheetName', name)
                update('tabName', '')
                update('columns', [])
              }}
              onTabChange={(tab, cols, rows) => {
                update('tabName', tab)
                update('columns', cols)
                update('previewRows', rows)
              }}
            />
            {errors.spreadsheetId && <p className="text-xs text-destructive mt-2" role="alert">{errors.spreadsheetId}</p>}
            {errors.tabName && <p className="text-xs text-destructive mt-1" role="alert">{errors.tabName}</p>}
          </div>
        )}

        {/* Step 3: Template */}
        {step === 2 && (
          <div>
            <MessageTemplateEditor
              columns={form.columns}
              value={form.messageTemplate}
              onChange={(v) => update('messageTemplate', v)}
              previewRows={form.previewRows}
            />
            {errors.messageTemplate && <p className="text-xs text-destructive mt-2" role="alert">{errors.messageTemplate}</p>}
          </div>
        )}

        {/* Step 4: Recipients */}
        {step === 3 && (
          <div>
            <FriendPicker
              selectedIds={form.recipientIds}
              onChange={(ids) => update('recipientIds', ids)}
            />
            {errors.recipientIds && <p className="text-xs text-destructive mt-2" role="alert">{errors.recipientIds}</p>}
          </div>
        )}

        {/* Step 5: Schedule */}
        {step === 4 && (
          <CronBuilder
            value={form.schedule}
            onChange={(v) => update('schedule', v)}
          />
        )}

        {/* Step 6: Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            {[
              { label: '📋 基本資訊', step: 0, rows: [
                { k: '名稱', v: form.name },
                { k: '描述', v: form.description || '—' },
              ]},
              { label: '📊 資料來源', step: 1, rows: [
                { k: 'Spreadsheet', v: form.spreadsheetName || '—' },
                { k: '工作表', v: form.tabName || '—' },
              ]},
              { label: '💬 訊息模板', step: 2, rows: [
                { k: '模板', v: form.messageTemplate.slice(0, 80) + (form.messageTemplate.length > 80 ? '...' : '') || '—' },
              ]},
              { label: `👥 接收者（${form.recipientIds.length} 人）`, step: 3, rows: [] },
              { label: '⏰ 排程', step: 4, rows: [
                { k: '類型', v: { none: '不設排程', once: '單次排程', recurring: '週期排程' }[form.schedule.type] },
              ]},
            ].map((section) => (
              <div key={section.label} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{section.label}</p>
                  <button
                    type="button"
                    onClick={() => setStep(section.step)}
                    className="text-xs text-primary hover:underline focus-visible:outline-none"
                  >
                    ✏️ 編輯
                  </button>
                </div>
                <div className="space-y-1">
                  {section.rows.map((r) => (
                    <div key={r.k} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0 w-20">└─ {r.k}：</span>
                      <span className="text-foreground truncate">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer nav */}
        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft size={14} /> 上一步
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(isEditMode ? `/cases/${id}` : '/cases')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                取消
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {step === STEPS.length - 1 ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {draftLabel}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isPending ? '處理中...' : confirmLabel}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                下一步 <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
