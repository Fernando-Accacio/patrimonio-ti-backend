const { Equipment } = require('../models');

class EquipmentRepository {
  async create(equipmentData) {
    return await Equipment.create(equipmentData);
  }

  async findAll() {
    return await Equipment.findAll();
  }

  async findByPatrimonio(patrimonio) {
    return await Equipment.findOne({ where: { patrimonio } });
  }

  async update(id, updateData) {
    await Equipment.update(updateData, { where: { id } });
    return await Equipment.findByPk(id);
  }
}

module.exports = new EquipmentRepository();