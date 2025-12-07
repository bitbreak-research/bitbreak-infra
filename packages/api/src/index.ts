import { Hono } from 'hono'
import middleware from './middleware'
import auth from './routes/auth'
import user from './routes/user'
import workers from './routes/workers'
import ws from './routes/ws'
import { scheduled } from './scheduled'

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
}

type Variables = {
  user: { sub: string; username: string }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply global middleware
app.route('/', middleware)

// Mount auth routes
app.route('/api/auth', auth)

// Mount user routes
app.route('/api/user', user)

// Mount worker routes
app.route('/api/workers', workers)

// Mount WebSocket route
// Handles worker WebSocket connections for metrics and status reporting
app.route('/', ws)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export { app }
export default {
  fetch: app.fetch,
  scheduled
}
