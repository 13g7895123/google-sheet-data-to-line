import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Sheet, Users, Clock, FileText, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { icon: LayoutDashboard, label: '儀表板', to: '/' },
  { icon: FolderOpen, label: 'Case 管理', to: '/cases' },
  { icon: Sheet, label: 'Google Sheets', to: '/google-sheets' },
  { icon: Users, label: 'LINE 好友', to: '/line-friends' },
  { icon: Clock, label: '排程管理', to: '/schedules' },
  { icon: FileText, label: '發送紀錄', to: '/logs' },
  { icon: Settings, label: '系統設定', to: '/settings' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r border-border transition-all duration-200 ease-out shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-border px-4 gap-3 overflow-hidden',
        collapsed && 'justify-center px-0'
      )}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Sheet size={15} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-foreground truncate font-mono">
            Sheet→LINE
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 relative',
                'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                isActive
                  ? 'bg-blue-50 text-primary before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary before:rounded-r'
                  : 'text-slate-700',
                collapsed && 'justify-center px-0'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'justify-center px-0'
          )}
          aria-label={collapsed ? '展開側欄' : '收合側欄'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>收合</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
