import type { Context, Next } from 'hono'

export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    const message = err instanceof Error ? err.message : '伺服器內部錯誤'
    const status = (err as { status?: number }).status ?? 500
    console.error('[ERROR]', message)
    return c.json({ message }, status as 400 | 404 | 500)
  }
}
