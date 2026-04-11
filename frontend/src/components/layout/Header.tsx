import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/': '儀表板',
  '/cases': 'Case 管理',
  '/cases/new': '新增 Case',
  '/google-sheets': 'Google Sheets 管理',
  '/line-friends': 'LINE 好友管理',
  '/schedules': '排程管理',
  '/logs': '發送紀錄',
  '/settings': '系統設定',
}

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/cases/') && pathname.endsWith('/edit')) return '編輯 Case'
  if (pathname.startsWith('/cases/')) return 'Case 詳情'
  if (pathname.startsWith('/google-sheets/')) return 'Google Sheet 詳情'
  return ''
}

export function Header() {
  const { pathname } = useLocation()
  const title = getTitle(pathname)

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-border shrink-0">
      <h1 className="text-base font-semibold text-foreground font-mono">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative"
          aria-label="通知"
        >
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
          A
        </div>
      </div>
    </header>
  )
}
