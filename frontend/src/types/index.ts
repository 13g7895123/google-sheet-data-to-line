// ─── Case ────────────────────────────────────────────────────────────────────

export type CaseStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'DONE'

export interface Case {
  id: string
  name: string
  description?: string
  status: CaseStatus
  sheetId?: string
  sheetName?: string
  spreadsheetId?: string
  tabName?: string
  messageTemplate?: string
  recipients: LineFriend[]
  schedule?: Schedule
  createdAt: string
  updatedAt: string
}

export interface CaseFormData {
  name: string
  description?: string
  spreadsheetId?: string
  tabName?: string
  messageTemplate?: string
  recipientIds: string[]
  schedule?: ScheduleInput
  status?: CaseStatus
}

// ─── Google Sheets ─────────────────────────────────────────────────────────

export interface GoogleSheet {
  id: string
  spreadsheetId: string
  name: string
  tabs: SheetTab[]
  caseCount: number
  createdAt: string
}

export interface SheetTab {
  name: string
  gid: string
}

export interface SheetPreviewRow {
  [column: string]: string | number
}

// ─── LINE Friends ───────────────────────────────────────────────────────────

export interface LineFriend {
  id: string
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
  caseCount?: number
}

// ─── Schedule ───────────────────────────────────────────────────────────────

export type ScheduleType = 'none' | 'once' | 'recurring'
export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly'
export type ScheduleStatus = 'ACTIVE' | 'PAUSED'

export interface Schedule {
  id: string
  caseId: string
  caseName?: string
  type: ScheduleType
  frequency?: ScheduleFrequency
  cronExpression?: string
  nextRunAt?: string
  status: ScheduleStatus
  runOnce?: string
}

export interface ScheduleInput {
  type: ScheduleType
  frequency?: ScheduleFrequency
  dayOfMonth?: number
  dayOfWeek?: number
  hour?: number
  minute?: number
  runOnce?: string
  cronExpression?: string
}

// ─── Send Log ────────────────────────────────────────────────────────────────

export type SendLogStatus = 'SUCCESS' | 'FAILED'

export interface SendLog {
  id: string
  caseId: string
  caseName?: string
  recipientId: string
  recipientName: string
  status: SendLogStatus
  messagePreview: string
  errorMessage?: string
  sentAt: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalCases: number
  todaySentCount: number
  successRate: number
  activeCaseCount: number
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  googleServiceAccountEmail: string
  googlePrivateKey: string
  googleConnectionStatus: 'connected' | 'disconnected' | 'unknown'
  lineChannelAccessToken: string
  lineChannelSecret: string
  lineWebhookUrl: string
  lineConnectionStatus: 'connected' | 'disconnected' | 'unknown'
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  message: string
  code?: string
}
