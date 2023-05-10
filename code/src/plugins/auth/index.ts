import fp from 'fastify-plugin'
import fastifyAuth from '@fastify/auth';
import fastifyCookie from '@fastify/cookie';
import fastifyBasicAuth from '@fastify/basic-auth';
import { Config } from '../../config';

declare module 'fastify' {
  interface FastifyRequest {
    _ctx: string
  }
}

const users: any = {
  "user": "password",
  "admin": "password",
};

const cookieName = "user";

export default fp(async function (app, cfg: Config) {
  app.decorateRequest('_ctx', 'unknown')

  if (!cfg.authEnabled) {
    return void app.log.info("Authentication is disabled")
  }

  app.register(fastifyAuth)

  app.register(fastifyCookie)

  app.register(fastifyBasicAuth, {
    async validate(username, password, req, reply) {
      if (users[username] === password) {
        req._ctx = username
        reply.setCookie(cookieName, username, {
          maxAge: 86400000,
          httpOnly: false
        })
      } else {
        req.log.info(`Basic authentication failed for user ${username}`)
        throw new Error()
      }
    }
  })

  app.after(() => {
    app.addHook('preHandler', app.auth([app.basicAuth]))
    app.log.info("Authentication is enabled")
  })
})
