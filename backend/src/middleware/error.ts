import type { Context, Next } from 'hono'
import { ZodError } from 'zod'

export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => i.message).join('; ')
      return c.json({ message }, 400)
    }
    const message = err instanceof Error ? err.message : '伺服器內部錯誤'
    const status = (err as { status?: number }).status ?? 500
    console.error('[ERROR]', message)
    return c.json({ message }, status as 400 | 404 | 500)
  }
}
