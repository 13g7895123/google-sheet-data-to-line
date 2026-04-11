import { useQuery } from '@tanstack/react-query'
import { FolderOpen, Send, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { getDashboardStats, getLogs, getUpcomingSchedules } from '@/lib/api'
import { formatDate, formatShortDate } from '@/lib/utils'

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['recent-logs'],
    queryFn: () => getLogs({ limit: 10 }),
  })

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['upcoming-schedules'],
    queryFn: () => getUpcomingSchedules(5),
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 h-24 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              icon={<FolderOpen size={18} />}
              label="Case 總數"
              value={stats?.totalCases ?? 0}
            />
            <StatCard
              icon={<Send size={18} />}
              label="今日發送數"
              value={stats?.todaySentCount ?? 0}
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="成功率"
              value={`${stats?.successRate ?? 0}%`}
            />
            <StatCard
              icon={<Clock size={18} />}
              label="排程中 Case"
              value={stats?.activeCaseCount ?? 0}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Logs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">最近發送紀錄</h2>
            <Link to="/logs" className="text-xs text-primary hover:underline">查看全部</Link>
          </div>

          {logsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !logsData?.data?.length ? (
            <EmptyState
              icon={<Send size={32} />}
              title="尚無發送紀錄"
              description="建立並執行 Case 後，紀錄會顯示在這裡"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">時間</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">接收者</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">狀態</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">訊息摘要</th>
                  </tr>
                </thead>
                <tbody>
                  {logsData.data.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatShortDate(log.sentAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground truncate max-w-[120px]">
                        {log.caseName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.recipientName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {log.status === 'SUCCESS'
                            ? <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                            : <XCircle size={14} className="text-red-500 shrink-0" />
                          }
                          <StatusBadge status={log.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">
                        {log.messagePreview}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Schedules */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">即將執行的排程</h2>
            <Link to="/schedules" className="text-xs text-primary hover:underline">查看全部</Link>
          </div>

          {schedulesLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !schedules?.length ? (
            <EmptyState
              icon={<Clock size={28} />}
              title="無待執行排程"
            />
          ) : (
            <div className="p-3 space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="p-3 rounded-lg bg-muted/50 border border-border/60">
                  <p className="text-sm font-medium text-foreground truncate">{s.caseName}</p>
                  {s.nextRunAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock size={11} className="inline mr-1" />
                      {formatDate(s.nextRunAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
