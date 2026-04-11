import { useState } from 'react'
import type { SheetPreviewRow } from '@/types'

interface SheetPreviewProps {
  rows: SheetPreviewRow[]
}

export function SheetPreview({ rows }: SheetPreviewProps) {
  const [limit, setLimit] = useState(5)
  if (!rows.length) return null

  const columns = Object.keys(rows[0])
  const displayRows = rows.slice(0, limit)

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">📋 資料預覽（前 {limit} 筆）</p>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-7 px-2 text-xs rounded border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="顯示筆數"
        >
          <option value={5}>5 筆</option>
          <option value={10}>10 筆</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60">
              {columns.map((col) => (
                <th key={col} className="text-left px-3 py-2 font-medium text-primary border-b border-border whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
