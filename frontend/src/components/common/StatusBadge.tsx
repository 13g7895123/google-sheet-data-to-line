import { cn } from '@/lib/utils'
import type { CaseStatus, SendLogStatus, ScheduleStatus } from '@/types'

type Status = CaseStatus | SendLogStatus | ScheduleStatus

const statusConfig: Record<Status, { label: string; className: string }> = {
  DRAFT: { label: '草稿', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  ACTIVE: { label: '啟用', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAUSED: { label: '暫停', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  DONE: { label: '完成', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  SUCCESS: { label: '成功', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  FAILED: { label: '失敗', className: 'bg-red-50 text-red-700 border-red-200' },
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
