import { google } from 'googleapis'
import { prisma } from './prisma'

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Google Service Account 尚未設定，請至系統設定填入憑證')
  }

  return new google.auth.JWT({
    email: email as string,
    key: key as string,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? urlOrId.trim()
}

export async function registerSheet(urlOrId: string) {
  const spreadsheetId = extractSpreadsheetId(urlOrId)
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })

  const { data } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'spreadsheetId,properties.title,sheets.properties',
  })

  const name = data.properties?.title ?? spreadsheetId
  const tabs = (data.sheets ?? []).map((s) => ({
    sheetName: s.properties?.title ?? '',
    gid: String(s.properties?.sheetId ?? '0'),
  }))

  const sheet = await prisma.googleSheet.upsert({
    where: { spreadsheetId },
    create: {
      spreadsheetId,
      spreadsheetName: name,
      tabs: { create: tabs },
    },
    update: {
      spreadsheetName: name,
      tabs: {
        deleteMany: {},
        create: tabs,
      },
    },
    include: { tabs: true },
  })

  return sheet
}

export async function previewSheet(spreadsheetId: string, tabName: string, limit = 5) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })

  const range = `${tabName}!A1:ZZ${limit + 1}`
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  const rows = data.values ?? []
  if (rows.length < 2) return []

  const headers = rows[0] as string[]
  return rows.slice(1, limit + 1).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = (row as string[])[i] ?? ''
    })
    return obj
  })
}

export async function readSheetData(spreadsheetId: string, tabName: string): Promise<Record<string, string>[]> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })

  const range = `${tabName}!A:ZZ`
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  const rows = data.values ?? []
  if (rows.length < 2) return []

  const headers = rows[0] as string[]
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = (row as string[])[i] ?? ''
    })
    return obj
  })
}

export async function testConnection(): Promise<boolean> {
  try {
    getAuth()
    return true
  } catch {
    return false
  }
}
