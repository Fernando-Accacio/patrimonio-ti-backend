const { Equipment } = require("../models");

class EquipmentRepository {
  async create(equipmentData) {
    // Ajustado: Mapeamento explícito para o ORM salvar a nova coluna no banco de dados
    return await Equipment.create({
      patrimonio: equipmentData.patrimonio,
      tipo: equipmentData.tipo,
      status: equipmentData.status,
      observacao: equipmentData.observacao,
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