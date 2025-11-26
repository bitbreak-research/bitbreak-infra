import { Hono } from "hono"

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
}

const userRoutes = new Hono<{ Bindings: Bindings }>()

userRoutes.get('/', async (c) => {

  // Find user
  const user = await c.env.bb.prepare(
    'SELECT id, username FROM users'
  ).all<{ id: string; username: string }>()

  return c.json(user)

})

export default userRoutes