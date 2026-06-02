const { User } = require('../models');

class UserRepository {
  async create(userData) {
    return await User.create(userData);
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findById(id) {
    return await User.findByPk(id, { 
      attributes: { exclude: ['senha'] } 
    });
  }

  async findAll() {
    return await User.findAll({ attributes: { exclude: ['senha'] } });
  }

  // NOVO MÉTODO: Ignora o bloqueio e traz a senha para validação do Bcrypt no login
  async findAllWithPassword() {
    return await User.findAll(); // Traz todos os campos sem exclusão
  }

  async update(id, updateData) {
    return await User.update(updateData, { where: { id } });
  }

  async delete(id) {
    return await User.destroy({ where: { id } });
  }
}

module.exports = new UserRepository();