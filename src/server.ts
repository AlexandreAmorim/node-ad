import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.routes';
import { sipolRoutes } from './routes/sipol.routes';
import { env } from './config/env';
import { detranRoutes } from './routes/detran.routes';

// Extende tipos do Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    requireAdmin: any;
  }
  interface FastifyRequest {
    user: any;
  }
}

async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development'
  });

  // Registra plugins
  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  // Decorators para autenticação
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ 
        success: false, 
        message: 'Token inválido ou expirado' 
      });
    }
  });

  app.decorate('requireAdmin', async (request: any, reply: any) => {
    // Aqui você pode implementar lógica para verificar se o usuário é admin
    // Por exemplo, verificar se pertence a um grupo específico do AD
    if (!request.user || !request.user.memberOf?.includes('CN=Domain Admins')) {
      reply.status(403).send({ 
        success: false, 
        message: 'Permissão administrativa necessária' 
      });
    }
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Registra rotas
  await app.register(authRoutes);
  await app.register(sipolRoutes);
  await app.register(detranRoutes)

  return app;
}

// Inicialização do servidor
async function start() {
  try {
    const app = await buildServer();
    
    await app.listen({
      port: parseInt(env.PORT),
      host: '0.0.0.0'
    });

    console.log(`🚀 Server running on port ${env.PORT}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
