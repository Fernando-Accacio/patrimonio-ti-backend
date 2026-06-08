const ticketRepository = require('../../infra/db/sequelize/repository/ticket.repository');
const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');
const sseService = require('./sse.service');

// Mapeamento estático para enxugar o if/else de alteração de status
const STATUS_EQUIPAMENTO_MAP = {
  'Concluído': 'Disponível',
  'Baixa': 'Baixa'
};

class TicketService {
  // Helper interno para evitar repetir a validação de existência do chamado
  async _buscarChamadoOuFalhar(id) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new Error('Chamado não encontrado.');
    return ticket;
  }

  async openTicket(data) {
    let equipment = await equipmentRepository.findByPatrimonio(data.patrimonio);
    
    if (!equipment) {
      equipment = await equipmentRepository.create({
        patrimonio: data.patrimonio,
        tipo: data.tipo,              
        status: 'Em Manutenção',
        observacao: data.localizacao,
        criado_por: 'Usuário (Via Chamado)'
      });
    } else {
      await equipmentRepository.update(equipment.id, { status: 'Em Manutenção' });
    }

    const newTicket = await ticketRepository.create({
      descricao_problema: data.descricao_problema,
      equipment_id: equipment.id,
      user_id: data.user_id,
      status_chamado: 'Aberto',
      tecnico_id: data.tecnico_id || null
    });
    
    sseService.broadcast({ action: 'RELOAD_DATA' }); 
    return newTicket;
  }

  async getAllTickets() {
    return await ticketRepository.findAll();
  }

  async updateTicketInfo(id, data) {
    const ticket = await this._buscarChamadoOuFalhar(id);

    if (['Concluído', 'Baixa'].includes(ticket.status_chamado)) {
      throw new Error('Operação negada: Chamados finalizados não podem ser editados.');
    }

    let equipment_id = ticket.equipment_id;

    if (data.patrimonio) {
      const equipmentDestino = await equipmentRepository.findByPatrimonio(data.patrimonio);

      if (!equipmentDestino) {
        await equipmentRepository.update(equipment_id, {
          patrimonio: data.patrimonio,
          tipo: data.tipo,
          observacao: data.localizacao,
          criado_por: 'Usuário (Via Chamado)'
        });
      } else {
        await equipmentRepository.update(equipmentDestino.id, {
          tipo: data.tipo || equipmentDestino.tipo,
          observacao: data.localizacao || equipmentDestino.observacao
        });
        equipment_id = equipmentDestino.id;
      }
    }

    const updatePayload = { 
      descricao_problema: data.descricao_problema,
      equipment_id 
    };

    if ('tecnico_id' in data) updatePayload.tecnico_id = data.tecnico_id;

    const updated = await ticketRepository.update(id, updatePayload);
    sseService.broadcast({ action: 'RELOAD_DATA' });
    return updated;
  }

  async updateTicketStatus(id, status_chamado, resolucao_ti) {
    const ticket = await this._buscarChamadoOuFalhar(id);

    const updatedTicket = await ticketRepository.update(id, {
      status_chamado,
      resolucao_ti: resolucao_ti || ticket.resolucao_ti 
    });

    // Reduzido de 8 linhas de if/else para apenas 1 linha usando o Objeto Lookup!
    const equipamentoStatus = STATUS_EQUIPAMENTO_MAP[status_chamado] || 'Em Manutenção';

    await equipmentRepository.update(ticket.equipment_id, { status: equipamentoStatus });
    sseService.broadcast({ action: 'RELOAD_DATA' }); 
    return updatedTicket;
  }

  async cancelTicket(id, userId, motivo) {
    const ticket = await this._buscarChamadoOuFalhar(id);
    
    if (ticket.user_id !== userId) throw new Error('Acesso negado: Você só pode cancelar seus próprios chamados.');
    if (ticket.status_chamado !== 'Aberto') throw new Error('Apenas chamados que ainda estão "Abertos" podem ser cancelados.');

    const updatedTicket = await ticketRepository.update(id, {
      status_chamado: 'Cancelado',
      resolucao_ti: `Cancelado pelo usuário. Justificativa: ${motivo}`
    });

    await equipmentRepository.update(ticket.equipment_id, { status: 'Disponível' });
    sseService.broadcast({ action: 'RELOAD_DATA' });
    return updatedTicket;
  }

  async getMyTickets(userId, role) {
    const { Ticket, Equipment, User } = require('../../infra/db/sequelize/models');
    const { Op } = require('sequelize');
    
    const whereCondition = role === 'TECH' 
      ? { [Op.or]: [{ tecnico_id: userId }, { user_id: userId }] }
      : { user_id: userId };

    return await Ticket.findAll({ 
      where: whereCondition,
      include: [
        { model: Equipment, as: 'equipment' },
        { model: User, as: 'tecnico', attributes: ['id', 'nome'] }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async assignTechnician(id, tecnico_id) {
    return await ticketRepository.update(id, { tecnico_id });
  }
}

module.exports = new TicketService();