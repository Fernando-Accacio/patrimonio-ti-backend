const { Equipment } = require("../models");

class EquipmentRepository {
  async create(equipmentData) {
    // 🌟 CORREÇÃO: Agora o Repository recebe os IDs e manda o Sequelize salvar!
    return await Equipment.create({
      patrimonio: equipmentData.patrimonio,
      equipment_type_id: equipmentData.equipment_type_id, // 🌟 AQUI O TIPO
      sector_id: equipmentData.sector_id,                 // 🌟 E AQUI O SETOR
      status: equipmentData.status,
      criado_por: equipmentData.criado_por 
    });
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

  async delete(id) {
    return await Equipment.destroy({ where: { id } });
  }
}

module.exports = new EquipmentRepository();