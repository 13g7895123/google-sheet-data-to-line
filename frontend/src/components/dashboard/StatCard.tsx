import { TrendingUp, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: number
  href?: string
  className?: string
}

export function StatCard({ icon, label, value, trend, href, className }: StatCardProps) {
  const inner = (
    <div className={cn(
      'bg-white rounded-xl border border-border p-5 flex items-start gap-4',
      href && 'hover:shadow-sm transition-shadow cursor-pointer',
      className
    )}>
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-foreground font-mono tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 mt-1 text-xs font-medium',
            trend >= 0 ? 'text-emerald-600' : 'text-red-600'
          )}>
            {trend >= 0
              ? <TrendingUp size={12} />
              : <TrendingDown size={12} />
            }
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link to={href} className="block">{inner}</Link>
  }
  return inner
}
