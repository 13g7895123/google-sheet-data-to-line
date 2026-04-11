import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { registerSheet, previewSheet } from '../lib/google-sheets'
import type { SheetRow, SheetTabRow } from '../lib/types'

type SheetWithTabs = SheetRow & { tabs: SheetTabRow[]; _count?: { cases: number } }

function formatSheet(s: SheetWithTabs) {
  return {
    id: s.id,
    spreadsheetId: s.spreadsheetId,
    name: s.spreadsheetName,
    tabs: s.tabs.map((t: SheetTabRow) => ({ name: t.sheetName, gid: t.gid })),
    caseCount: s._count?.cases ?? 0,
    createdAt: s.createdAt.toISOString(),
  }
}

export const sheetsRouter = new Hono()

// GET /api/sheets
sheetsRouter.get('/', async (c) => {
  const sheets = await prisma.googleSheet.findMany({
    include: { tabs: true, _count: { select: { cases: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return c.json(sheets.map(formatSheet))
})

// POST /api/sheets
sheetsRouter.post('/', async (c) => {
  const body = await c.req.json<{ urlOrId?: string }>()
  const schema = z.object({ urlOrId: z.string().min(1) })
  const { urlOrId } = schema.parse(body)

  const sheet = await registerSheet(urlOrId)

  return c.json(formatSheet(sheet), 201)
})

// GET /api/sheets/:id
sheetsRouter.get('/:id', async (c) => {
  const sheet = await prisma.googleSheet.findUniqueOrThrow({
    where: { id: c.req.param('id') },
    include: { tabs: true, _count: { select: { cases: true } } },
  })

  return c.json(formatSheet(sheet))
})

// DELETE /api/sheets/:id
sheetsRouter.delete('/:id', async (c) => {
  await prisma.googleSheet.delete({ where: { id: c.req.param('id') } })
  return c.json({ ok: true })
})

// GET /api/sheets/:spreadsheetId/preview?tab=&limit=
sheetsRouter.get('/:spreadsheetId/preview', async (c) => {
  const { spreadsheetId } = c.req.param()
  const tab = c.req.query('tab')
  const limit = Number(c.req.query('limit') ?? '5')

  if (!tab) return c.json({ message: '缺少 tab 參數' }, 400)

  const rows = await previewSheet(spreadsheetId, tab, limit)
  return c.json(rows)
})
