import axios from 'axios'
import type {
  Case, CaseFormData, GoogleSheet, LineFriend, Schedule,
  SendLog, DashboardStats, Settings, PaginatedResponse, SheetPreviewRow
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message ?? err.message ?? '發生錯誤'
    return Promise.reject(new Error(message))
  }
)

// ─── Dashboard ──────────────────────────────────────────────────────────────

export const getDashboardStats = () =>
  api.get<DashboardStats>('/dashboard/stats').then((r) => r.data)

// ─── Cases ──────────────────────────────────────────────────────────────────

export const getCases = (params?: {
  status?: string
  search?: string
  page?: number
  pageSize?: number
}) =>
  api.get<PaginatedResponse<Case>>('/cases', { params }).then((r) => r.data)

export const getCase = (id: string) =>
  api.get<Case>(`/cases/${id}`).then((r) => r.data)

export const createCase = (data: CaseFormData) =>
  api.post<Case>('/cases', data).then((r) => r.data)

export const updateCase = (id: string, data: Partial<CaseFormData>) =>
  api.put<Case>(`/cases/${id}`, data).then((r) => r.data)

export const deleteCase = (id: string) =>
  api.delete(`/cases/${id}`).then((r) => r.data)

export const sendCase = (id: string) =>
  api.post(`/cases/${id}/send`).then((r) => r.data)

// ─── Google Sheets ──────────────────────────────────────────────────────────

export const getSheets = () =>
  api.get<GoogleSheet[]>('/sheets').then((r) => r.data)

export const getSheet = (id: string) =>
  api.get<GoogleSheet>(`/sheets/${id}`).then((r) => r.data)

export const addSheet = (urlOrId: string) =>
  api.post<GoogleSheet>('/sheets', { urlOrId }).then((r) => r.data)

export const deleteSheet = (id: string) =>
  api.delete(`/sheets/${id}`).then((r) => r.data)

export const getSheetPreview = (spreadsheetId: string, tabName: string, limit = 5) =>
  api.get<SheetPreviewRow[]>(`/sheets/${spreadsheetId}/preview`, {
    params: { tab: tabName, limit },
  }).then((r) => r.data)

// ─── LINE Friends ────────────────────────────────────────────────────────────

export const getLineFriends = (params?: { search?: string; page?: number; pageSize?: number }) =>
  api.get<PaginatedResponse<LineFriend>>('/line/friends', { params }).then((r) => r.data)

export const syncLineFriends = () =>
  api.post('/line/friends/sync').then((r) => r.data)

// ─── Schedules ───────────────────────────────────────────────────────────────

export const getSchedules = (params?: { status?: string }) =>
  api.get<Schedule[]>('/schedules', { params }).then((r) => r.data)

export const getUpcomingSchedules = (limit = 5) =>
  api.get<Schedule[]>('/schedules', { params: { upcoming: true, limit } }).then((r) => r.data)

export const toggleSchedule = (id: string, status: 'ACTIVE' | 'PAUSED') =>
  api.patch<Schedule>(`/schedules/${id}`, { status }).then((r) => r.data)

// ─── Send Logs ───────────────────────────────────────────────────────────────

export const getLogs = (params?: {
  caseId?: string
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  limit?: number
}) =>
  api.get<PaginatedResponse<SendLog>>('/logs', { params }).then((r) => r.data)

// ─── Settings ────────────────────────────────────────────────────────────────

export const getSettings = () =>
  api.get<Settings>('/settings').then((r) => r.data)

export const saveSettings = (data: Partial<Settings>) =>
  api.put<Settings>('/settings', data).then((r) => r.data)

export const testLineConnection = () =>
  api.post('/settings/test-line').then((r) => r.data)

export const testGoogleConnection = () =>
  api.post('/settings/test-google').then((r) => r.data)
