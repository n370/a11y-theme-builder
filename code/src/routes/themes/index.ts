import { FastifyInstance } from "fastify";

export default async function (app: FastifyInstance) {
  app.addHook('onRequest', async (req) => {
    req.log.info(`themes endpoint ${req.method}`);
  })

  app.route<{
    Querystring: { metadata: string }
  }>({
    method: 'GET',
    url: '/',
    async handler(req) {
      const metadata = req.query.metadata;
      if (metadata === undefined) {
        return app.storage.getDocNames();
      }
      else {
        return app.storage.getMetadata();
      }
    }
  })

  app.route<{
    Body: unknown
  }>({
    method: 'POST',
    url: '/',
    async handler(req) {
      const data = req.body;
      if (!Object.getOwnPropertyNames(data).length) {
        throw app.httpErrors.notImplemented()
      }
      let r;
      try {
        r = await app.storage.createDoc(data);
      } catch (e) {
        throw app.httpErrors.badGateway((e as Error).message)
      }
      return r
    }
  })

  app.route({
    method: 'DELETE',
    url: '/',
    async handler() {
      return app.storage.deleteDocs();
    }
  })
}
