const userRepository = require('../../infra/db/sequelize/repository/user.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../core/env');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const CRYPTO_SECRET = process.env.CRYPTO_SECRET || '12345678901234567890123456789012'; 

const encryptEmail = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(CRYPTO_SECRET), iv);
  let encrypted = cipher.update(text.toLowerCase());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decryptEmail = (text) => {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(CRYPTO_SECRET), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return text;
  }
};

const ofuscarEmail = (emailLimpo) => {
  const [nome, dominio] = emailLimpo.split('@');
  if (!nome || !dominio) return emailLimpo;
  const showChars = Math.min(2, nome.length);
  return `${nome.substring(0, showChars)}***@${dominio}`;
};

const gerarSenhaAutomatica = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const length = Math.floor(Math.random() * (12 - 8 + 1)) + 8;
  let senha = "";
  for (let i = 0; i < length; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
};

// ==========================================
// ARMAZENAMENTO EM MEMÓRIA
// ==========================================
let pendentesReset = []; 
let historicoReset = []; // NOVO: Guarda os últimos 5 processados

class UserService {
  async createUser(data) {
    data.email = encryptEmail(data.email);
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
      role: u.role
    }));
  }

  async updatePassword(id, novaSenha) {
    if (!novaSenha || novaSenha.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    return await userRepository.update(id, { senha: hashedPassword });
  }

  // --- RECOVERY FLOWS ---

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

  async getPendingResets() {
    return pendentesReset;
  }

  // NOVO MÉTODO: Retorna os últimos 5 do histórico
  async getResetHistory() {
    return historicoReset;
  }

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

    // Salva no histórico antes de remover da fila de pendentes
    historicoReset.unshift({
      ...solicitacao,
      status: 'Aprovado',
      dataProcessamento: new Date().toISOString()
    });
    if (historicoReset.length > 5) historicoReset.pop(); // Trava estrita em 5 itens

    pendentesReset.splice(index, 1);
    return true;
  }

  async rejectPasswordReset(resetId) {
    const index = pendentesReset.findIndex(p => p.id === parseInt(resetId));
    if (index === -1) throw new Error('Solicitação não encontrada.');
    
    const solicitacao = pendentesReset[index];

    // Salva no histórico como Recusado
    historicoReset.unshift({
      ...solicitacao,
      status: 'Recusado',
      dataProcessamento: new Date().toISOString()
    });
    if (historicoReset.length > 5) historicoReset.pop();

    pendentesReset.splice(index, 1);
    return true;
  }
}

module.exports = new UserService();