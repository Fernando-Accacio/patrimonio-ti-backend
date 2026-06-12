const userRepository = require("../../infra/db/sequelize/repository/user.repository");
const passwordResetRepository = require("../../infra/db/sequelize/repository/passwordReset.repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../../core/env");

// BUSCANDO OS UTILS NO CAMINHO EXATO DA SUA ESTRUTURA 🚀
const {
  encryptEmail,
  decryptEmail,
  ofuscarEmail,
  gerarSenhaAutomatica,
} = require("../../core/utils/auth.utils");

class UserService {
  async createUser(data) {
    // 1. Validar se o e-mail termina com o domínio correto de Itapecerica
    const emailLimpo = data.email.trim().toLowerCase();
    if (!emailLimpo.endsWith("@itapecerica.sp.gov.br")) {
      throw new Error(
        "Acesso negado: O e-mail deve ser institucional (@itapecerica.sp.gov.br).",
      );
    }

    // 2. Validar se o ramal foi enviado
    if (!data.ramal || data.ramal.trim() === "") {
      throw new Error("O número do ramal é obrigatório para o cadastro.");
    }

    data.email = encryptEmail(emailLimpo);
    const senhaGerada = gerarSenhaAutomatica();
    data.senha = await bcrypt.hash(senhaGerada, 10);

    try {
      const novoUser = await userRepository.create(data);
      console.log(`[DEV] Usuário criado! Senha automática: ${senhaGerada}`);
      return novoUser;
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError")
        throw new Error("E-mail já cadastrado.");
      throw error;
    }
  }

  async login(email, senha) {
    const allUsers = await userRepository.findAllWithPassword();
    const user = allUsers.find(
      (u) => decryptEmail(u.email) === email.toLowerCase().trim(),
    );

    if (!user) throw new Error("Usuário não encontrado.");
    if (!user.senha)
      throw new Error("Erro interno na autenticação. Contate o administrador.");

    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    if (!isPasswordValid) throw new Error("Senha incorreta.");

    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.app.jwtSecret,
      { expiresIn: "8h" },
    );

    // 🌟 CORREÇÃO: Removemos o 'ofuscarEmail' daqui para o dono da conta ver seu próprio e-mail!
    // Aproveitei e deixei o 'ramal' mapeado também para preencher a sua modal se precisar.
    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: decryptEmail(user.email), // 🔓 Agora descriptografa puro para o próprio usuário
        role: user.role,
        ramal: user.ramal,
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
      ramal: u.ramal, // 🌟 ADICIONE ESTA LINHA PARA LIBERAR O RAMAL NA LISTA GERAL!
    }));
  }

  async updatePassword(id, novaSenha) {
    if (!novaSenha || novaSenha.length < 6)
      throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    return await userRepository.update(id, { senha: hashedPassword });
  }

  async requestPasswordReset(emailInput) {
    const allUsers = await userRepository.findAll();
    const user = allUsers.find(
      (u) => decryptEmail(u.email) === emailInput.toLowerCase(),
    );

    if (!user)
      throw new Error(
        "Se este e-mail existir no sistema, uma solicitação foi enviada aos administradores.",
      );

    // 🌟 Substituído: Consulta o banco ao invés do Array
    const jaPediu = await passwordResetRepository.findPendingByUserId(user.id);
    if (jaPediu)
      throw new Error("Você já possui uma solicitação pendente. Aguarde o TI.");

    // 🌟 Substituído: Salva no banco de dados!
    await passwordResetRepository.create({
      userId: user.id,
      status: "Pendente",
    });

    return true;
  }

  async getPendingResets() {
    const pendentes = await passwordResetRepository.findAllPending();
    // Mapeamos para manter exatamente o mesmo formato JSON que seu frontend já espera
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

    const user = await userRepository.findById(solicitacao.userId);
    if (!user) {
      await passwordResetRepository.updateStatus(resetId, "Recusado");
      throw new Error("Usuário não existe mais.");
    }

    const novaSenha = gerarSenhaAutomatica();
    await this.updatePassword(user.id, novaSenha);

    console.log(
      `[DEV] Senha do Usuário ${user.nome} resetada pelo Admin! Nova Senha: ${novaSenha}`,
    );

    // 🌟 Substituído: Atualiza a linha no banco de dados
    await passwordResetRepository.updateStatus(resetId, "Aprovado");
    return true;
  }

  async rejectPasswordReset(resetId) {
    const solicitacao = await passwordResetRepository.findById(resetId);
    if (!solicitacao || solicitacao.status !== "Pendente") {
      throw new Error("Solicitação não encontrada.");
    }

    // 🌟 Substituído: Atualiza a linha no banco de dados
    await passwordResetRepository.updateStatus(resetId, "Recusado");
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
