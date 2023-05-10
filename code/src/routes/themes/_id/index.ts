import { FastifyInstance, FastifyRequest } from "fastify";

export default async function (app: FastifyInstance) {
  app.addHook('onRequest', async (req: FastifyRequest<{ Params: { id: string }}>) => {
    const id = req.params.id;
    req.log.info(`theme endpoint ${req.method} with id=${id}`)
  })

  app.route<{
    Params: { id: string }
    Querystring: { fields: string }
  }>({
    method: 'GET',
    url: '/',
    async handler(req) {
      const id = req.params.id;
      const fields = req.query.fields ? (""+req.query.fields).split(",") : undefined;
      let r;
      try {
        r = await app.storage.getDoc(id, fields);
      } catch (e) {
        throw app.httpErrors.notFound((e as Error).message)
      }
      return r;
    }
  })

  app.route<{
    Params: { id: string }
    Querystring: { returnDoc: string }
    Body: unknown
  }>({
    method: ['PUT', 'PATCH'],
    url: '/',
    async handler(req) {
      const id = req.params.id;
      const data = req.body;
      const returnDoc = (req.query.returnDoc == "true") ? true : false;
      return app.storage.updateDoc(id, data, returnDoc);
    }
  })

  app.route<{
    Params: { id: string }
  }>({
    method: 'DELETE',
    url: '/',
    async handler(req) {
      const id = req.params.id;
      return app.storage.deleteDoc(id);
    }
  })
}
