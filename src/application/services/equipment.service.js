const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');

class EquipmentService {
  async createEquipment(data) {
    // Verifica se o patrimônio já foi cadastrado
    const exists = await equipmentRepository.findByPatrimonio(data.patrimonio);
    if (exists) {
      throw new Error('Este número de patrimônio já está cadastrado no sistema.');
    }
    
    return await equipmentRepository.create(data);
  }

  async getAllEquipments() {
    return await equipmentRepository.findAll();
  }

  async updateEquipmentStatus(id, newStatus) {
    // Ex: Atualiza de 'Em Uso' para 'Manutenção'
    return await equipmentRepository.update(id, { status: newStatus });
  }
}

module.exports = new EquipmentService();