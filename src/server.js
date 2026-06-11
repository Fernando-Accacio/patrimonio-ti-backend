const Fastify = require('fastify');
const cors = require('@fastify/cors');
const fastifySwagger = require('@fastify/swagger');
const fastifySwaggerUI = require('@fastify/swagger-ui');
const env = require('./core/env');
const routes = require('./presentation/routes/routes.js');

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }
});

fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
});

fastify.register(fastifySwagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'API Gestão de Patrimônio TI',
      description: 'Documentação da API de controle de equipamentos e chamados da Prefeitura.',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://localhost:${env.app.port}`,
        description: 'Servidor Local de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  }
});

fastify.register(fastifySwaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
});

fastify.register(routes, { prefix: "/api" });

const start = async () => {
  try {
    await fastify.listen({ port: env.app.port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = fastify;