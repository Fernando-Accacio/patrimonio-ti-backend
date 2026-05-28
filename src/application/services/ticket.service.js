const ticketRepository = require('../../infra/db/sequelize/repository/ticket.repository');
const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');

class TicketService {
  async openTicket(data) {
    let equipment = await equipmentRepository.findByPatrimonio(data.patrimonio);
    
    if (!equipment) {
      equipment = await equipmentRepository.create({
        patrimonio: data.patrimonio,
        tipo: data.tipo,              
        status: 'Em Manutenção',
        observacao: data.localizacao  
      });
    } else {
      await equipmentRepository.update(equipment.id, { status: 'Em Manutenção' });
    }

    const ticketData = {
      descricao_problema: data.descricao_problema,
      equipment_id: equipment.id,
      user_id: data.user_id,
      status_chamado: 'Aberto'
    };

    return await ticketRepository.create(ticketData);
  }

  async getAllTickets() {
    return await ticketRepository.findAll();
  }

  async updateTicketDescription(id, descricao_problema) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new Error('Chamado não encontrado.');

    if (ticket.status_chamado === 'Concluído') {
      throw new Error('Operação negada: Chamados concluídos não podem ser editados.');
    }

    return await ticketRepository.update(id, { descricao_problema });
  }

  async updateTicketStatus(id, status_chamado, resolucao_ti) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new Error('Chamado não encontrado.');

    const updatedTicket = await ticketRepository.update(id, {
      status_chamado,
      resolucao_ti: resolucao_ti || ticket.resolucao_ti 
    });

    let equipamentoStatus = 'Em Manutenção';
    
    if (status_chamado === 'Concluído') {
      equipamentoStatus = 'Disponível';
    } else if (status_chamado === 'Baixa') {
      equipamentoStatus = 'Baixa';
    }

    await equipmentRepository.update(ticket.equipment_id, { status: equipamentoStatus });

    return updatedTicket;
  }
}

module.exports = new TicketService();