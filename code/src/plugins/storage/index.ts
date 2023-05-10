import fp from 'fastify-plugin'
import Storage from './Storage'

declare module 'fastify' {
  interface FastifyInstance {
    storage: Storage
  }
}

export default fp(async function (app) {
  const storage = new Storage({ logger: app.log })

  app.decorate('storage', storage)

  app.addHook('onReady', async () => {
    await storage.connect()
  })
})
