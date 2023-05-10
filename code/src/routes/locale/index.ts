import { FastifyInstance } from "fastify";
import { promises as fs } from "fs";
import { join } from "path";

export default async function (app: FastifyInstance) {
  app.addHook('onRequest', async (req) => {
    req.log.info(`locale endpoint ${req.method}`);
  })

  app.route<{
    Querystring: { metadata: string }
  }>({
    method: 'GET',
    url: '/',
    async handler(req) {
      const r = await fs.readFile(
        join(__dirname, '..', '..', 'ui', 'src', 'locales', 'data.json'),
        "utf8"
      );
      req.log.debug("r=",JSON.stringify(JSON.parse(r),null,4))
      return r
    }
  })

  app.route<{
    Body: Record<string, unknown>
  }>({
    method: 'POST',
    url: '/',
    async handler(req) {
      const data = req.body;
      req.log.debug("data=",typeof data);
      const r = await fs.readFile(
        join(__dirname, '..', '..', 'ui', 'src', 'locales', 'data.json'),
        "utf8"
      );
      const json = JSON.parse(r);
      for (var key in data) {
          json[key] = data[key];
      }
      req.log.debug("json=",JSON.stringify(json,null,4));
      await fs.writeFile(
        join(__dirname, '..', '..', 'ui', 'src', 'locales', 'data.json'),
        JSON.stringify(json,null,4), "utf8"
      );
      return json;
    }
  })
}
