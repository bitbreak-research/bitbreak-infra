import { Hono } from 'hono'

const middleware = new Hono()

middleware.use(async (c, next) => {
  await next()
})

export default middleware