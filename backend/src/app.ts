import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler } from './middleware/error'
import { sheetsRouter } from './routes/sheets'
import { lineRouter } from './routes/line'
import { casesRouter } from './routes/cases'
import { schedulesRouter } from './routes/schedules'
import { logsRouter } from './routes/logs'
import { dashboardRouter } from './routes/dashboard'
import { settingsRouter } from './routes/settings'
import { sadminRouter } from './routes/sadmin'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use('*', errorHandler)

// Health check
app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }))

// Routes
app.route('/api/sheets', sheetsRouter)
app.route('/api/line', lineRouter)
app.route('/api/webhook', lineRouter)   // /api/webhook/line
app.route('/api/cases', casesRouter)
app.route('/api/schedules', schedulesRouter)
app.route('/api/logs', logsRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/settings', settingsRouter)
app.route('/api/sadmin', sadminRouter)

export default app
