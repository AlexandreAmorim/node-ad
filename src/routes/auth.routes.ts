import { FastifyInstance } from 'fastify';
import { ActiveDirectoryService } from '../lib/active-directory';
import { 
  loginSchema, 
  changePasswordSchema, 
  adminResetPasswordSchema 
} from '../schemas/auth.schemas';
import { bearerSecurity } from '../openapi/components';
import { zodToSchema } from '../openapi/zod-to-schema';
import { resolverContextoUsuario } from '../service/secoes';

export async function authRoutes(app: FastifyInstance) {

  app.post('/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login via Active Directory',
      body: zodToSchema(loginSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            token: { type: 'string' },
            user: { $ref: 'AuthUser#' },
          },
        },
        400: { $ref: 'ErrorAuth#' },
        401: { $ref: 'ErrorAuth#' },
      },
    },
  }, async (request, reply) => {
    try {
      const { username, password } = loginSchema.parse(request.body);
      const isAuthenticated = await ActiveDirectoryService.authenticate(username, password);
      
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Busca informações do usuário
      const user = await ActiveDirectoryService.findUser(username);

      const ctx = await resolverContextoUsuario({
        dn: user.dn,
        memberOf: user.memberOf,
      });

      const sAMAccountName = user.sAMAccountName ?? username.split('@')[0];

      // Gera token JWT enriquecido com seção / SEI / papéis
      const token = app.jwt.sign(
        { 
          username: sAMAccountName,
          dn: user.dn,
          displayName: user.displayName,
          mail: user.mail,
          memberOf: user.memberOf,
          secao: ctx.secao,
          secaoId: ctx.secaoId,
          ouPath: ctx.ouPath,
          seiUnidade: ctx.seiUnidade,
          papeis: ctx.papeis,
        },
        { expiresIn: '8h' }
      );

      return reply.send({
        success: true,
        token,
        user: {
          username: sAMAccountName,
          displayName: user.displayName,
          email: user.mail,
          description: user.description,
          dn: user.dn,
          secao: ctx.secao,
          secaoId: ctx.secaoId,
          ouPath: ctx.ouPath,
          seiUnidade: ctx.seiUnidade,
          papeis: ctx.papeis,
        }
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao fazer login'
      });
    }
  });

  // Change password endpoint (usuário troca própria senha)
  app.post('/auth/change-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Trocar senha do próprio usuário',
      body: zodToSchema(changePasswordSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: { $ref: 'ErrorAuth#' },
        401: { $ref: 'ErrorAuth#' },
      },
    },
  }, async (request, reply) => {
    try {
      const { username, oldPassword, newPassword } = changePasswordSchema.parse(request.body);
      
      // Verifica se a senha atual está correta
      const isAuthenticated = await ActiveDirectoryService.authenticate(username, oldPassword);
      
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          message: 'Senha atual incorreta'
        });
      }

      // Troca a senha
      await ActiveDirectoryService.changePassword(username, oldPassword, newPassword);

      return reply.send({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao trocar senha'
      });
    }
  });

  // Admin reset password endpoint (requer autenticação JWT e privilégios admin)
  app.post('/admin/reset-password', {
    preHandler: [app.authenticate, app.requireAdmin],
    schema: {
      tags: ['Auth'],
      summary: 'Reset de senha (admin)',
      security: [...bearerSecurity],
      body: zodToSchema(adminResetPasswordSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: { $ref: 'ErrorAuth#' },
        401: { $ref: 'ErrorAuth#' },
        403: { $ref: 'ErrorAuth#' },
      },
    },
  }, async (request, reply) => {
    try {
      const { targetUsername, newPassword } = adminResetPasswordSchema.parse(request.body);
      
      await ActiveDirectoryService.adminResetPassword(targetUsername, newPassword);

      return reply.send({
        success: true,
        message: `Senha resetada com sucesso para o usuário ${targetUsername}`
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao resetar senha'
      });
    }
  });

  // Get user info endpoint
  app.get('/auth/user/:username', {
    preHandler: [app.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Obter informações de um usuário do AD',
      security: [...bearerSecurity],
      params: {
        type: 'object',
        properties: {
          username: { type: 'string' },
        },
        required: ['username'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: { $ref: 'AuthUserDetail#' },
          },
        },
        401: { $ref: 'ErrorAuth#' },
        404: { $ref: 'ErrorAuth#' },
      },
    },
  }, async (request, reply) => {
    try {
      const { username } = request.params as { username: string };
      
      const user = await ActiveDirectoryService.findUser(username);

      return reply.send({
        success: true,
        user: {
          username: user.sAMAccountName,
          displayName: user.displayName,
          email: user.mail,
          dn: user.dn,
          memberOf: user.memberOf,
          department: user.department,
          title: user.title
        }
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Usuário não encontrado'
      });
    }
  });
}
