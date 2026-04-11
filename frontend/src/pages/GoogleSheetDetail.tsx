import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { SheetPreview } from '@/components/sheets/SheetPreview'
import { getSheet, getSheetPreview } from '@/lib/api'

export function GoogleSheetDetail() {
  const { id } = useParams<{ id: string }>()
  const [selectedTab, setSelectedTab] = useState<string | null>(null)

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['sheet', id],
    queryFn: () => getSheet(id!),
    enabled: !!id,
  })

  const { data: previewRows = [] } = useQuery({
    queryKey: ['sheet-preview', sheet?.spreadsheetId, selectedTab],
    queryFn: () => getSheetPreview(sheet!.spreadsheetId, selectedTab!),
    enabled: !!(sheet?.spreadsheetId && selectedTab),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-40 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!sheet) return null

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          to="/google-sheets"
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="返回"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-foreground">📊 {sheet.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Spreadsheet ID: {sheet.spreadsheetId}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">工作表列表</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">工作表名稱</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">GID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {sheet.tabs.map((tab) => (
              <tr key={tab.gid} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{tab.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tab.gid}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedTab(selectedTab === tab.name ? null : tab.name)}
                    className="text-xs text-primary hover:underline focus-visible:outline-none"
                  >
                    {selectedTab === tab.name ? '收起' : '預覽資料'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTab && previewRows.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            資料預覽 — {selectedTab}
          </h2>
          <SheetPreview rows={previewRows} />
        </div>
      )}
    </div>
  )
}
