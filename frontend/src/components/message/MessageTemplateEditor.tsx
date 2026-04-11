import { useRef, useState } from 'react'
import type { SheetPreviewRow } from '@/types'

interface MessageTemplateEditorProps {
  columns: string[]
  value: string
  onChange: (v: string) => void
  previewRows?: SheetPreviewRow[]
}

const MAX_LENGTH = 5000

export function MessageTemplateEditor({ columns, value, onChange, previewRows = [] }: MessageTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [previewIndex, setPreviewIndex] = useState(0)

  const insertField = (col: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = value.slice(0, start) + `{{${col}}}` + value.slice(end)
    onChange(newValue)
    setTimeout(() => {
      const pos = start + col.length + 4
      textarea.setSelectionRange(pos, pos)
      textarea.focus()
    }, 0)
  }

  const renderPreview = () => {
    if (!previewRows.length || !value) return value
    const row = previewRows[previewIndex] ?? {}
    return value.replace(/\{\{(.+?)\}\}/g, (_, key: string) => {
      const v = row[key.trim()]
      return v !== undefined ? String(v) : `{{${key}}}`
    })
  }

  const highlightedTemplate = value.replace(
    /\{\{(.+?)\}\}/g,
    '<mark class="bg-primary/15 text-primary rounded px-0.5">{{$1}}</mark>'
  )

  return (
    <div className="space-y-4">
      {/* Field chips */}
      {columns.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">可用欄位（點擊即插入）：</p>
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => insertField(col)}
                className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            訊息模板 <span className="text-destructive">*</span>
          </label>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="輸入訊息模板，使用 {{欄位名}} 插入動態內容..."
            rows={8}
            maxLength={MAX_LENGTH}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
            aria-label="訊息模板"
          />
          <div className="flex justify-between mt-1">
            <div
              className="text-xs text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedTemplate.slice(0, 100) + (highlightedTemplate.length > 100 ? '...' : '') }}
            />
            <span className={`text-xs ${value.length > MAX_LENGTH * 0.9 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {value.length}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">
              即時預覽
            </label>
            {previewRows.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>第</span>
                <select
                  value={previewIndex}
                  onChange={(e) => setPreviewIndex(Number(e.target.value))}
                  className="h-7 px-2 rounded border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="預覽資料筆數"
                >
                  {previewRows.map((_, i) => (
                    <option key={i} value={i}>{i + 1}</option>
                  ))}
                </select>
                <span>筆</span>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-emerald-50/50 p-4 min-h-[180px]">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs shrink-0">
                💬
              </div>
              <div className="flex-1 bg-white rounded-lg px-3 py-2.5 text-sm text-foreground leading-relaxed shadow-sm whitespace-pre-wrap">
                {renderPreview() || <span className="text-muted-foreground italic">預覽將顯示在這裡...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
