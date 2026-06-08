const userRepository = require('../../infra/db/sequelize/repository/user.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../core/env');

// BUSCANDO OS UTILS NO CAMINHO EXATO DA SUA ESTRUTURA 🚀
const { encryptEmail, decryptEmail, ofuscarEmail, gerarSenhaAutomatica } = require('../../core/utils/auth.utils');

let pendentesReset = []; 
let historicoReset = []; 

class UserService {
  async createUser(data) {
    // 1. Validar se o e-mail termina com o domínio correto de Itapecerica
    const emailLimpo = data.email.trim().toLowerCase();
    if (!emailLimpo.endsWith('@itapecerica.sp.gov.br')) {
      throw new Error('Acesso negado: O e-mail deve ser institucional (@itapecerica.sp.gov.br).');
    }

    // 2. Validar se o ramal foi enviado
    if (!data.ramal || data.ramal.trim() === '') {
      throw new Error('O número do ramal é obrigatório para o cadastro.');
    }

    data.email = encryptEmail(emailLimpo);
    const senhaGerada = gerarSenhaAutomatica();
    data.senha = await bcrypt.hash(senhaGerada, 10);

    try {
      const novoUser = await userRepository.create(data);
      console.log(`[DEV] Usuário criado! Senha automática: ${senhaGerada}`);
      return novoUser;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') throw new Error('E-mail já cadastrado.');
      throw error;
    }
  }

  async login(email, senha) {
    const allUsers = await userRepository.findAllWithPassword();
    const user = allUsers.find(u => decryptEmail(u.email) === email.toLowerCase());
    
    if (!user) throw new Error('Usuário não encontrado.');
    if (!user.senha) throw new Error('Erro interno na autenticação. Contate o administrador.');

    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    if (!isPasswordValid) throw new Error('Senha incorreta.');

    const token = jwt.sign({ id: user.id, role: user.role }, env.app.jwtSecret, { expiresIn: '8h' });

    return { 
      token, 
      user: { id: user.id, nome: user.nome, email: ofuscarEmail(decryptEmail(user.email)), role: user.role } 
    };
  }

  async getAllUsers() {
    const users = await userRepository.findAll();
    return users.map(u => ({
      id: u.id,
      nome: u.nome,
      email: ofuscarEmail(decryptEmail(u.email)),
      role: u.role,
      ramal: u.ramal // 🌟 ADICIONE ESTA LINHA PARA LIBERAR O RAMAL NA LISTA GERAL!
    }));
  }

  async updatePassword(id, novaSenha) {
    if (!novaSenha || novaSenha.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    return await userRepository.update(id, { senha: hashedPassword });
  }

  async requestPasswordReset(emailInput) {
    const allUsers = await userRepository.findAll();
    const user = allUsers.find(u => decryptEmail(u.email) === emailInput.toLowerCase());
    
    if (!user) throw new Error('Se este e-mail existir no sistema, uma solicitação foi enviada aos administradores.');
    
    const jaPediu = pendentesReset.find(p => p.userId === user.id);
    if (jaPediu) throw new Error('Você já possui uma solicitação pendente. Aguarde o TI.');

    pendentesReset.push({
      id: Date.now(),
      userId: user.id,
      nome: user.nome,
      email: ofuscarEmail(decryptEmail(user.email)),
      dataSolicitacao: new Date().toISOString()
    });

    return true;
  }

  async getPendingResets() { return pendentesReset; }
  async getResetHistory() { return historicoReset; }

  async approvePasswordReset(resetId) {
    const index = pendentesReset.findIndex(p => p.id === parseInt(resetId));
    if (index === -1) throw new Error('Solicitação não encontrada ou já processada.');

    const solicitacao = pendentesReset[index];
    const user = await userRepository.findById(solicitacao.userId);
    
    if (!user) {
      pendentesReset.splice(index, 1);
      throw new Error('Usuário não existe mais.');
    }

    const novaSenha = gerarSenhaAutomatica();
    await this.updatePassword(user.id, novaSenha);

    console.log(`[DEV] Senha do Usuário ${user.nome} resetada pelo Admin! Nova Senha: ${novaSenha}`);

    historicoReset.unshift({ ...solicitacao, status: 'Aprovado', dataProcessamento: new Date().toISOString() });
    if (historicoReset.length > 5) historicoReset.pop(); 

    pendentesReset.splice(index, 1);
    return true;
  }

  async rejectPasswordReset(resetId) {
    const index = pendentesReset.findIndex(p => p.id === parseInt(resetId));
    if (index === -1) throw new Error('Solicitação não encontrada.');
    
    const solicitacao = pendentesReset[index];

    historicoReset.unshift({ ...solicitacao, status: 'Recusado', dataProcessamento: new Date().toISOString() });
    if (historicoReset.length > 5) historicoReset.pop();

    pendentesReset.splice(index, 1);
    return true;
  }

  async updateRole(id, role) {
    return await userRepository.update(id, { role });
  }

  async deleteUser(id) {
    return await userRepository.delete(id);
  }
}

module.exports = new UserService();