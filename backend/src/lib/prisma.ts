import { PrismaLibSql as PrismaLibSQL } from '@prisma/adapter-libsql'
import { resolve } from 'path'
// @ts-ignore - Prisma 7 generated client
import { PrismaClient as _PrismaClient } from '../../generated/prisma/client.ts'

const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
// libsql requires absolute file paths: file:/abs/path/to/dev.db
function toLibsqlUrl(url: string): string {
  if (url.startsWith('file:')) {
    const filePath = url.slice('file:'.length)
    const abs = resolve(filePath)
    return `file:${abs}`
  }
  return url
}

const adapter = new PrismaLibSQL({ url: toLibsqlUrl(rawUrl) })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PrismaClient = _PrismaClient as unknown as new (opts: { adapter: unknown }) => any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma?: any }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
