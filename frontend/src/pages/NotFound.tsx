import { Link } from 'react-router-dom'
import { Home, AlertCircle } from 'lucide-react'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6 text-muted-foreground">
        <AlertCircle size={32} />
      </div>
      <p className="text-4xl font-bold text-foreground font-mono mb-2">404</p>
      <p className="text-base font-medium text-foreground mb-1">找不到此頁面</p>
      <p className="text-sm text-muted-foreground mb-8">
        您要求的頁面不存在或已被移除。
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Home size={16} /> 返回儀表板
      </Link>
    </div>
  )
}
