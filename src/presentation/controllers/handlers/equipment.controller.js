const equipmentService = require('../../../application/services/equipment.service');
const sseService = require('../../../application/services/sse.service'); // RE-IMPORTADO O SSE AQUI!

class EquipmentController {
  async create(req, res) {
    try {
      const data = { ...req.body, criado_por: 'Admin (Manual)' };
      const equipment = await equipmentService.createEquipment(data);
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(201).send(equipment);
    } catch (e) { 
      return res.status(400).send({ error: e.message }); 
    }
  }

  async list(req, res) {
    try {
      const equipments = await equipmentService.getAllEquipments();
      return res.status(200).send(equipments);
    } catch (e) {
      return res.status(500).send({ error: 'Erro ao buscar equipamentos.' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      await equipmentService.updateEquipmentStatus(id, req.body.status || 'Disponível');
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(200).send({ message: 'Equipamento atualizado com sucesso.' });
    } catch (e) { 
      return res.status(400).send({ error: e.message }); 
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await equipmentService.deleteEquipment(id); 
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(200).send({ message: 'Equipamento inativado com sucesso.' });
    } catch (e) { 
      return res.status(400).send({ error: 'Não é possível deletar equipamento com histórico de chamados ativo.' }); 
    }
  }
}

module.exports = new EquipmentController();