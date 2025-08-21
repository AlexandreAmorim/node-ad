import ActiveDirectory from 'activedirectory2';
import ldap from 'ldapjs';
import { env } from '../config/env';

// Configuração do Active Directory
const adConfig = {
  url: env.AD_URL,
  baseDN: env.AD_BASE_DN,
  username: env.AD_USERNAME,
  password: env.AD_PASSWORD,
  tlsOptions: {
    rejectUnauthorized: env.AD_TLS_REJECT_UNAUTHORIZED === 'true'
  }
};

const ad = new ActiveDirectory(adConfig);

export class ActiveDirectoryService {
  /**
   * Autentica um usuário no AD
   */
  static async authenticate(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Adiciona o domínio se não estiver presente
      const fullUsername = username.includes('@') ? username : `${username}@${env.AD_BASE_DN.replace(/DC=/g, '').replace(/,/g, '.')}`;

      ad.authenticate(fullUsername, password, (err, auth) => {
        if (err) {
          console.error('Authentication error:', err);
          resolve(false);
        } else {
          resolve(auth === true);
        }
      });
    });
  }

  /**
   * Busca informações de um usuário
   */
  static async findUser(username: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const sAMAccountName = username.split('@')[0];
      
      ad.findUser(sAMAccountName, (err, user) => {
        if (err) {
          reject(new Error(`Erro ao buscar usuário: ${err.message}`));
        } else if (!user) {
          reject(new Error('Usuário não encontrado'));
        } else {
          resolve(user);
        }
      });
    });
  }

  /**
   * Troca a senha de um usuário usando LDAP direto
   */
  static async changePassword(
    username: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cria cliente LDAP
      const client = ldap.createClient({
        url: env.AD_URL,
        tlsOptions: {
          rejectUnauthorized: env.AD_TLS_REJECT_UNAUTHORIZED === 'true'
        }
      });

      // Primeiro, autentica com as credenciais do usuário
      const userDN = `CN=${username},${env.AD_BASE_DN}`;
      
      client.bind(userDN, oldPassword, (bindErr) => {
        if (bindErr) {
          client.unbind();
          reject(new Error('Senha atual incorreta ou usuário inválido'));
          return;
        }

        // Prepara a nova senha no formato Unicode com aspas
        const newPasswordBuffer = Buffer.from(
          '"' + newPassword + '"',
          'utf16le'
        );

        // Modifica a senha
        const change = new ldap.Change({
          operation: 'replace',
          modification: {
            unicodePwd: newPasswordBuffer
          }
        });

        client.modify(userDN, change, (modifyErr) => {
          client.unbind();
          
          if (modifyErr) {
            // Trata erros específicos do AD
            if (modifyErr.message.includes('CONSTRAINT_VIOLATION')) {
              reject(new Error('A nova senha não atende aos requisitos de complexidade do domínio'));
            } else if (modifyErr.message.includes('UNWILLING_TO_PERFORM')) {
              reject(new Error('Não é possível alterar a senha. Verifique se está usando LDAPS (porta 636)'));
            } else {
              reject(new Error(`Erro ao alterar senha: ${modifyErr.message}`));
            }
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Reset de senha administrativa (requer privilégios de admin)
   */
  static async adminResetPassword(
    targetUsername: string,
    newPassword: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: env.AD_URL,
        tlsOptions: {
          rejectUnauthorized: env.AD_TLS_REJECT_UNAUTHORIZED === 'true'
        }
      });

      // Autentica com conta administrativa
      client.bind(env.AD_USERNAME, env.AD_PASSWORD, (bindErr) => {
        if (bindErr) {
          client.unbind();
          reject(new Error('Falha na autenticação administrativa'));
          return;
        }

        // Busca o DN do usuário alvo
        const searchOptions = {
          filter: `(sAMAccountName=${targetUsername})`,
          scope: 'sub',
          attributes: ['dn']
        };

        client.search(env.AD_BASE_DN, searchOptions, (searchErr, res) => {
          if (searchErr) {
            client.unbind();
            reject(new Error(`Erro na busca: ${searchErr.message}`));
            return;
          }

          let userDN: string | null = null;

          res.on('searchEntry', (entry) => {
            userDN = entry.objectName;
          });

          res.on('end', () => {
            if (!userDN) {
              client.unbind();
              reject(new Error('Usuário não encontrado'));
              return;
            }

            // Prepara a nova senha
            const newPasswordBuffer = Buffer.from(
              '"' + newPassword + '"',
              'utf16le'
            );

            const change = new ldap.Change({
              operation: 'replace',
              modification: {
                unicodePwd: newPasswordBuffer
              }
            });

            client.modify(userDN, change, (modifyErr) => {
              client.unbind();
              
              if (modifyErr) {
                reject(new Error(`Erro ao resetar senha: ${modifyErr.message}`));
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  }
}