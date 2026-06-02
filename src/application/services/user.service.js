const userRepository = require('../../infra/db/sequelize/repository/user.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../core/env');

// Função auxiliar para gerar senha automática
const gerarSenhaAutomatica = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const length = Math.floor(Math.random() * (12 - 8 + 1)) + 8; // Entre 8 e 12
  let senha = "";
  for (let i = 0; i < length; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
};

class UserService {
  async createUser(data) {
    const userExists = await userRepository.findByEmail(data.email);
    if (userExists) throw new Error('E-mail já cadastrado.');

    // 1. Gera senha automática forte
    const senhaGerada = gerarSenhaAutomatica();

    // 2. Criptografa a senha gerada
    const hashedPassword = await bcrypt.hash(senhaGerada, 10);
    data.senha = hashedPassword;

    const novoUser = await userRepository.create(data);

    // TODO: NO FUTURO, INSERIR CHAMADA AO NODEMAILER AQUI
    // await emailService.enviarSenhaCriada(data.email, data.nome, senhaGerada);
    
    // (Apenas para fins de dev local, você pode imprimir a senha no console para ver funcionando)
    console.log(`[DEV] Usuário criado! Senha automática: ${senhaGerada}`);

    return novoUser;
  }

  async login(email, senha) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Usuário não encontrado.');

    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    if (!isPasswordValid) throw new Error('Senha incorreta.');

    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.app.jwtSecret,
      { expiresIn: '8h' } 
    );

    return { 
      token, 
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role } 
    };
  }

  // Atualizar Senha (com criptografia)
  async updatePassword(id, novaSenha) {
    if (!novaSenha || novaSenha.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    return await userRepository.update(id, { senha: hashedPassword });
  }
}

module.exports = new UserService();