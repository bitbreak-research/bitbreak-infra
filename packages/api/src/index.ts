import { Hono } from 'hono'
import middleware from './middleware'
import auth from './routes/auth'
import user from './routes/user'

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

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export default app
