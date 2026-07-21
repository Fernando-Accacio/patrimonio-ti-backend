const { User } = require('../models');

class UserRepository {
  async create(userData) {
    return await User.create(userData);
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findByEmailWithDeleted(email) {
    return await User.findOne({ where: { email }, paranoid: false });
  }

  async findByMatriculaWithDeleted(matricula) {
    return await User.findOne({ where: { matricula }, paranoid: false });
  }

  async restore(id) {
    return await User.restore({ where: { id } });
  }

  async findById(id) {
    return await User.findByPk(id, { 
      attributes: { exclude: ['senha'] } 
    });
  }

  async findAll() {
    return await User.findAll({ attributes: { exclude: ['senha'] } });
  }

  async findAllWithPassword() {
    return await User.findAll();
  }

  async update(id, updateData) {
    await User.update(updateData, { where: { id }, paranoid: false });
    return await User.findByPk(id, { paranoid: false });
  }

  async delete(id) {
    return await User.destroy({ where: { id } });
  }
}

module.exports = new UserRepository();