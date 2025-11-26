import { Hono } from 'hono'
import middleware from './middleware'

type Bindings = {
  bb: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>()

// Middleware for all routes
app.route('/', middleware)

app.get('/hello', async (c) => {
  return c.json({ hello: 'world' })
})

app.get('/create-table', async (c) => {
  const result = await c.env.bb.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT)')
  return c.text(`Table created!`)
})

app.get('/insert-user', async (c) => {
  const statement = c.env.bb.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  await statement.bind('John Doe', 'john.doe@example.com').run()
  return c.text('User inserted!')
})

app.get('/', async (c) => {
  const statement = c.env.bb.prepare('SELECT * FROM users')
  const result = await statement.run()
  return c.json(result.results)
})

export default app
