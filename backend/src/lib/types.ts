// Shared inline types derived from Prisma query results
// Avoids importing from @ts-nocheck generated files directly

export type SheetTabRow = { id: string; sheetName: string; gid: string; googleSheetId: string }
export type SheetRow = { id: string; spreadsheetId: string; spreadsheetName: string; createdAt: Date; updatedAt: Date }
export type FriendRow = { id: string; lineUserId: string; displayName: string; pictureUrl: string | null; statusMessage: string | null; syncedAt: Date }
export type ScheduleRow = { id: string; caseId: string; cronExpression: string | null; scheduledAt: Date | null; isRecurring: boolean; isActive: boolean; lastRunAt: Date | null; nextRunAt: Date | null; createdAt: Date }
export type SendLogRow = { id: string; caseId: string; scheduleId: string | null; lineUserId: string; recipientName: string; messageContent: string; status: 'SUCCESS' | 'FAILED'; errorMessage: string | null; sentAt: Date }
export type CaseRow = { id: string; name: string; description: string | null; googleSheetId: string | null; sheetTabId: string | null; messageTemplate: string | null; status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'DONE'; createdAt: Date; updatedAt: Date }
