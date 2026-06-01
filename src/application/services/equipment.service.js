const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');
const sseService = require('./sse.service');

class EquipmentService {
  async createEquipment(data) {
    const exists = await equipmentRepository.findByPatrimonio(data.patrimonio);
    if (exists) {
      throw new Error('Este número de patrimônio já está cadastrado no sistema.');
    }
    
    // Ajustado: Passa os dados estruturados garantindo o recebimento do criado_por
    const newEq = await equipmentRepository.create({
      patrimonio: data.patrimonio,
      tipo: data.tipo,
      observacao: data.observacao,
      status: data.status || 'Disponível',
      criado_por: data.criado_por // Carimbo vindo do controller ('Admin (Manual)')
    });
    
    sseService.broadcast({ action: 'RELOAD_DATA' }); // Atualiza a tela
    return newEq;
  }

  async getAllEquipments() {
    return await equipmentRepository.findAll();
  }

  async updateEquipmentStatus(id, newStatus) {
    const updated = await equipmentRepository.update(id, { status: newStatus });
    sseService.broadcast({ action: 'RELOAD_DATA' });
    return updated;
  }

  async deleteEquipment(id) {
    const deleted = await equipmentRepository.delete(id);
    sseService.broadcast({ action: 'RELOAD_DATA' }); // Atualiza a tela e some
    return deleted;
  }
}

module.exports = new EquipmentService();