import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Cases } from '@/pages/Cases'
import { CaseDetail } from '@/pages/CaseDetail'
import { CaseForm } from '@/components/cases/CaseForm'
import { GoogleSheets } from '@/pages/GoogleSheets'
import { GoogleSheetDetail } from '@/pages/GoogleSheetDetail'
import { LineFriends } from '@/pages/LineFriends'
import { Schedules } from '@/pages/Schedules'
import { Logs } from '@/pages/Logs'
import { Settings } from '@/pages/Settings'
import { NotFound } from '@/pages/NotFound'
import { SeedAdmin } from '@/pages/SeedAdmin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cases" element={<Cases />} />
            <Route path="cases/new" element={<CaseForm />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="cases/:id/edit" element={<CaseForm />} />
            <Route path="google-sheets" element={<GoogleSheets />} />
            <Route path="google-sheets/:id" element={<GoogleSheetDetail />} />
            <Route path="line-friends" element={<LineFriends />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="logs" element={<Logs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sadmin" element={<SeedAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
