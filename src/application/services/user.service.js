const userRepository = require('../../infra/db/sequelize/repository/user.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../core/env');

class UserService {
  async createUser(data) {
    // 1. Verifica se o e-mail já existe
    const userExists = await userRepository.findByEmail(data.email);
    if (userExists) {
      throw new Error('E-mail já cadastrado.');
    }

    // 2. Criptografa a senha antes de salvar
    const hashedPassword = await bcrypt.hash(data.senha, 10);
    data.senha = hashedPassword;

    // 3. Salva no banco
    return await userRepository.create(data);
  }

  async login(email, senha) {
    // 1. Busca o usuário
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    // 2. Compara a senha digitada com a criptografada no banco
    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    if (!isPasswordValid) {
      throw new Error('Senha incorreta.');
    }

    // 3. Gera o Token JWT contendo o ID e a Role (ADMIN/USER)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.app.jwtSecret,
      { expiresIn: '8h' } // Token expira em 8 horas (um turno de trabalho)
    );

    return { 
      token, 
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role } 
    };
  }
}

module.exports = new UserService();