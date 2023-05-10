/*
* Copyright (c) 2023 Discover Financial Services
* Licensed under MIT License. See License.txt in the project root for license information
*/
import fastifyAutoload from '@fastify/autoload';
import fastifyCors, { FastifyCorsOptions } from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import fastify, { FastifyRequest } from 'fastify';
import { join } from "path";
import { Config } from "./config";

main().catch((err) => {
  console.error(err)
  process.exit(1)
});

async function main() {
  const cfg = new Config();

  const envToLogger = {
    development: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    production: true,
    test: false,
  }

  const app = fastify({
    logger: envToLogger[(process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test']
  })

  app.setErrorHandler(function (err, req, reply) {
    if (err.statusCode === 401) {
      req.log.debug("Sending 401 response with WWW-Authenticate header")
      reply.header("WWW-Authenticate", "Basic");
      reply.code(401)
      return void reply.send()
    }
    req.log.warn(`Caught error for ${req.url} (${err.statusCode}): ${err.stack}`);
    return void reply.send(err)
  })

  app.register(fastifySensible)

  app.register(fastifyCors, () => {
    return (req: FastifyRequest, callback: (...args: unknown[]) => void) => {
      const corsOptions: FastifyCorsOptions = {
        origin: cfg.corsOrigin,
        methods: 'GET,PUT,POST,DELETE,PATCH',
        allowedHeaders: ['Content-Type']
      };

      if (req.method === 'OPTION') {
        corsOptions.maxAge = 60 * 60 * 24 * 365
      }

      callback(null, corsOptions)
    }
  })

  app.register(fastifyAutoload, {
    dir: join(__dirname, 'plugins'),
    options: cfg
  });

  app.register(fastifyStatic, {
    root: join(__dirname, '..', 'src', 'ui', 'build'),
    wildcard: false
  })

  app.get("/*", (req, reply) => reply.sendFile('index.html'))

  app.register(fastifyAutoload, {
    dir: join(__dirname, 'routes'),
    options: { prefix: 'api' },
    routeParams: true
  });

  app.listen({ port: parseInt(process.env.PORT || '3001') });
}
