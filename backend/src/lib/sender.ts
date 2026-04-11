import { prisma } from './prisma'
import { readSheetData } from './google-sheets'
import { sendMessage, renderTemplate } from './line-bot'

export async function sendCase(caseId: string, scheduleId?: string): Promise<{ success: number; failed: number }> {
  const case_ = await prisma.case.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      googleSheet: true,
      sheetTab: true,
      recipients: { include: { lineFriend: true } },
    },
  })

  if (!case_.googleSheet || !case_.sheetTab || !case_.messageTemplate) {
    throw new Error('Case 設定不完整，缺少資料來源或訊息模板')
  }

  const sheetData = await readSheetData(
    case_.googleSheet.spreadsheetId,
    case_.sheetTab.sheetName
  )

  let success = 0
  let failed = 0

  for (const recipient of case_.recipients) {
    const friend = recipient.lineFriend
    // 在 sheet 資料中找出對應的行（透過 LINE ID 欄位比對）
    const row = sheetData.find((r) =>
      Object.values(r).some((v) => v === friend.lineUserId)
    ) ?? {}

    const message = renderTemplate(case_.messageTemplate, row)

    try {
      await sendMessage(friend.lineUserId, message)
      await prisma.sendLog.create({
        data: {
          caseId,
          scheduleId: scheduleId ?? null,
          lineUserId: friend.lineUserId,
          recipientName: friend.displayName,
          messageContent: message,
          status: 'SUCCESS',
        },
      })
      success++
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await prisma.sendLog.create({
        data: {
          caseId,
          scheduleId: scheduleId ?? null,
          lineUserId: friend.lineUserId,
          recipientName: friend.displayName,
          messageContent: message,
          status: 'FAILED',
          errorMessage,
        },
      })
      failed++
    }
  }

  return { success, failed }
}
