import { FastifyInstance } from 'fastify';
import { ActiveDirectoryService } from '../lib/active-directory';
import { 
  loginSchema, 
  changePasswordSchema, 
  adminResetPasswordSchema 
} from '../schemas/auth.schemas';

export async function authRoutes(app: FastifyInstance) {

  app.post('/auth/login', async (request, reply) => {
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
      
      // Gera token JWT
      const token = app.jwt.sign(
        { 
          username,
          dn: user.dn,
          displayName: user.displayName,
          mail: user.mail 
        },
        { expiresIn: '8h' }
      );

      return reply.send({
        success: true,
        token,
        user: {
          username: user.sAMAccountName,
          displayName: user.displayName,
          email: user.mail,
          dn: user.dn
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
  app.post('/auth/change-password', async (request, reply) => {
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
    preHandler: [app.authenticate, app.requireAdmin]
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
    preHandler: [app.authenticate]
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