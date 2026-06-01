const userRepository = require('../../infra/db/sequelize/repository/user.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../core/env');

class UserService {
  async createUser(data) {
    const userExists = await userRepository.findByEmail(data.email);
    if (userExists) throw new Error('E-mail já cadastrado.');

    const hashedPassword = await bcrypt.hash(data.senha, 10);
    data.senha = hashedPassword;

    return await userRepository.create(data);
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

  // Atualizar Nome e E-mail
  async updateProfile(id, data) {
    // Se ele está tentando mudar o email, precisamos checar se já não existe outro com esse email
    if (data.email) {
      const emailExists = await userRepository.findByEmail(data.email);
      if (emailExists && emailExists.id !== parseInt(id)) {
        throw new Error('Este e-mail já está em uso por outro usuário.');
      }
    }
    return await userRepository.update(id, { nome: data.nome, email: data.email });
  }

  //Atualizar Senha (com criptografia)
  async updatePassword(id, novaSenha) {
    if (!novaSenha || novaSenha.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    return await userRepository.update(id, { senha: hashedPassword });
  }
}

module.exports = new UserService();