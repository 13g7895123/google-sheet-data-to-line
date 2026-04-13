import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { getLogs } from '@/lib/api'
import { Pagination } from '@/components/common/Pagination'
import { cn } from '@/lib/utils'

interface SendLogTableProps {
  caseId?: string
}

const PAGE_SIZE = 20

export function SendLogTable({ caseId }: SendLogTableProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['logs', caseId, page],
    queryFn: () => getLogs({ caseId, page, pageSize: PAGE_SIZE }),
  })

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">尚無發送紀錄</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">狀態</th>
              {!caseId && (
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">接收者</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">訊息預覽</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">發送時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.data.map((log) => (
              <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  {log.status === 'SUCCESS' ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 size={14} />
                      <span className="hidden sm:inline">成功</span>
                    </span>
                  ) : (
                    <span
                      className={cn('inline-flex items-center gap-1.5 text-destructive')}
                      title={log.errorMessage}
                    >
                      <XCircle size={14} />
                      <span className="hidden sm:inline">失敗</span>
                    </span>
                  )}
                </td>
                {!caseId && (
                  <td className="px-4 py-3 text-foreground">{log.caseName ?? log.caseId}</td>
                )}
                <td className="px-4 py-3 text-foreground">{log.recipientName}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                  {log.messagePreview}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                  {new Date(log.sentAt).toLocaleString('zh-TW', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={data.total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
