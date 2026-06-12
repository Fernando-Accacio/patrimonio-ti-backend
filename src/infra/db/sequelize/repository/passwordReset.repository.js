const { PasswordReset, User } = require('../models');

class PasswordResetRepository {
  async create(data) {
    return await PasswordReset.create(data);
  }

  async findPendingByUserId(userId) {
    return await PasswordReset.findOne({
      where: { userId, status: 'Pendente' }
    });
  }

  async findById(id) {
    return await PasswordReset.findByPk(id);
  }

  async findAllPending() {
    // Busca os pendentes e já traz o Nome e Email do usuário associado
    return await PasswordReset.findAll({
      where: { status: 'Pendente' },
      include: [{ model: User, as: 'user' }],
      order: [['createdAt', 'ASC']]
    });
  }

  async findAllHistory() {
    return await PasswordReset.findAll({
      where: { status: ['Aprovado', 'Recusado'] },
      include: [{ model: User, as: 'user' }],
      order: [['updatedAt', 'DESC']],
      limit: 15 // Mantém o histórico leve, pegando só os últimos 15
    });
  }

  async updateStatus(id, status) {
    return await PasswordReset.update({ status }, { where: { id } });
  }
}

module.exports = new PasswordResetRepository();