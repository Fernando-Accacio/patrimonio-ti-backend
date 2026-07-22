const userRepository = require("../../infra/db/sequelize/repository/user.repository");
const passwordResetRepository = require("../../infra/db/sequelize/repository/passwordReset.repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../../core/env");
const emailService = require("./email.service"); // 🌟 IMPORTAMOS O CARTEIRO

const {
  encryptEmail, decryptEmail, ofuscarEmail, gerarSenhaAutomatica,
} = require("../../core/utils/auth.utils");

class UserService {
  async createUser(data) {
    const emailLimpo = data.email.trim().toLowerCase();
    
    // 🔒 TRAVA REATIVADA: Permite apenas e-mails institucionais
    if (!emailLimpo.endsWith("@itapecerica.sp.gov.br")) {
      throw new Error("Acesso negado: O e-mail deve ser institucional (@itapecerica.sp.gov.br).");
    }

    const ramalLimpo = String(data.ramal || "").trim();
    if (!ramalLimpo) throw new Error("O número do ramal é obrigatório para o cadastro.");
    if (!/^[0-9]{1,11}$/.test(ramalLimpo)) throw new Error("O número do ramal deve conter de 1 a 11 dígitos.");

    const matriculaLimpa = String(data.matricula || "").trim();
    if (!matriculaLimpa) throw new Error("A matrícula é obrigatória para o cadastro.");

    const emailEncriptado = encryptEmail(emailLimpo);
    const senhaGerada = gerarSenhaAutomatica();
    const senhaHash = await bcrypt.hash(senhaGerada, 10);

    // 1. Busca se e-mail ou matrícula já existem no banco (incluindo inativos)
    const existingEmailUser = await userRepository.findByEmailWithDeleted(emailEncriptado);
    const existingMatriculaUser = await userRepository.findByMatriculaWithDeleted(matriculaLimpa);

    // 2. Se existirem ATIVOS no sistema, bloqueia normalmente
    if (existingEmailUser && !existingEmailUser.deletedAt) {
      throw new Error("E-mail já cadastrado.");
    }
    if (existingMatriculaUser && !existingMatriculaUser.deletedAt) {
      throw new Error("Esta matrícula já está em uso por outro usuário.");
    }

    // 3. Se for um usuário deletado (Soft Delete), REATIVA e atualiza
    const userToRestore = existingEmailUser || existingMatriculaUser;
    let userFinal;

    if (userToRestore && userToRestore.deletedAt) {
      await userRepository.restore(userToRestore.id);
      
      userFinal = await userRepository.update(userToRestore.id, {
        nome: data.nome,
        email: emailEncriptado,
        ramal: ramalLimpo,
        matricula: matriculaLimpa,
        role: data.role || 'USER',
        senha: senhaHash,
        primeira_senha: true
      });
    } else {
      // 4. Se for um cadastro totalmente inédito, cria do zero
      userFinal = await userRepository.create({
        nome: data.nome,
        email: emailEncriptado,
        ramal: ramalLimpo,
        matricula: matriculaLimpa,
        role: data.role || 'USER',
        senha: senhaHash,
        primeira_senha: true
      });
    }

    await emailService.enviarSenha(emailLimpo, data.nome, senhaGerada, false);

    return userFinal;
  }

  async login(email, senha) {
    const allUsers = await userRepository.findAllWithPassword();
    const emailBuscado = email.toLowerCase().trim();

    // 🌟 Garante busca exata comparando e-mail descriptografado
    const user = allUsers.find((u) => {
      try {
        return decryptEmail(u.email).toLowerCase().trim() === emailBuscado;
      } catch (e) {
        return false;
      }
    });

    if (!user) throw new Error("Usuário não encontrado.");
    if (!user.senha) throw new Error("Erro interno na autenticação. Contate o administrador.");

    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    if (!isPasswordValid) throw new Error("Senha incorreta.");

    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.app.jwtSecret,
      { expiresIn: "8h" }
    );

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: decryptEmail(user.email),
        role: user.role,
        ramal: user.ramal,
        matricula: user.matricula,
        primeira_senha: user.primeira_senha
      },
    };
  }

  async getAllUsers() {
    const users = await userRepository.findAll();
    return users.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: ofuscarEmail(decryptEmail(u.email)),
      role: u.role,
      ramal: u.ramal, 
      matricula: u.matricula,
    }));
  }

  async updatePassword(id, novaSenha) {
    if (!novaSenha || novaSenha.length < 6)
      throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    
    return await userRepository.update(id, { 
      senha: hashedPassword, 
      primeira_senha: false 
    });
  }

  async requestPasswordReset(emailInput) {
    const allUsers = await userRepository.findAll();
    const user = allUsers.find((u) => decryptEmail(u.email) === emailInput.toLowerCase());

    if (!user) throw new Error("Se este e-mail existir no sistema, uma solicitação foi enviada aos administradores.");

    const jaPediu = await passwordResetRepository.findPendingByUserId(user.id);
    if (jaPediu) throw new Error("Você já possui uma solicitação pendente. Aguarde o TI.");

    await passwordResetRepository.create({ userId: user.id, status: "Pendente" });
    return true;
  }

  async getPendingResets() {
    const pendentes = await passwordResetRepository.findAllPending();
    return pendentes.map((p) => ({
      id: p.id,
      userId: p.userId,
      nome: p.user ? p.user.nome : "Usuário Deletado",
      email: p.user ? ofuscarEmail(decryptEmail(p.user.email)) : "",
      dataSolicitacao: p.createdAt,
    }));
  }

  async getResetHistory() {
    const history = await passwordResetRepository.findAllHistory();
    return history.map((p) => ({
      id: p.id,
      userId: p.userId,
      nome: p.user ? p.user.nome : "Usuário Deletado",
      email: p.user ? ofuscarEmail(decryptEmail(p.user.email)) : "",
      status: p.status,
      dataProcessamento: p.updatedAt,
    }));
  }

  async approvePasswordReset(resetId) {
    const solicitacao = await passwordResetRepository.findById(resetId);
    if (!solicitacao || solicitacao.status !== "Pendente") {
      throw new Error("Solicitação não encontrada ou já processada.");
    }

    // 🌟 TRAVA DE CORRIDA (Race Condition Lock): 
    // Muda o status IMEDIATAMENTE para "Processando". 
    // Se o admin der "Double Click", a 2ª requisição vai bater na trava do "Pendente" ali em cima e falhar!
    await passwordResetRepository.updateStatus(resetId, "Processando");

    const user = await userRepository.findById(solicitacao.userId);
    if (!user) {
      await passwordResetRepository.updateStatus(resetId, "Recusado");
      throw new Error("Usuário não existe mais.");
    }

    const novaSenha = gerarSenhaAutomatica();
    await this.updatePassword(user.id, novaSenha);

    // Dispara o e-mail
    const emailRealParaEnvio = decryptEmail(user.email);
    await emailService.enviarSenha(emailRealParaEnvio, user.nome, novaSenha, true);

    // Finaliza marcando como Aprovado
    await passwordResetRepository.updateStatus(resetId, "Aprovado");
    return true;
  }

  async rejectPasswordReset(resetId) {
    const solicitacao = await passwordResetRepository.findById(resetId);
    if (!solicitacao || solicitacao.status !== "Pendente") {
      throw new Error("Solicitação não encontrada.");
    }
    const user = await userRepository.findById(solicitacao.userId);
    await passwordResetRepository.updateStatus(resetId, "Recusado");
    return true;
  }

  async updateRole(id, role) { return await userRepository.update(id, { role }); }
  async deleteUser(id) { return await userRepository.delete(id); }
}

module.exports = new UserService();