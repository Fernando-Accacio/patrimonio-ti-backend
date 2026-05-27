const ticketRepository = require('../../infra/db/sequelize/repository/ticket.repository');
const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');

class TicketService {
  async openTicket(data) {
    // O usuário enviou o número do patrimônio, precisamos achar o ID do equipamento
    const equipment = await equipmentRepository.findByPatrimonio(data.patrimonio);
    
    if (!equipment) {
      throw new Error('Equipamento com este patrimônio não foi encontrado na base.');
    }

    // Monta o objeto final para salvar no banco
    const ticketData = {
      descricao_problema: data.descricao_problema,
      equipment_id: equipment.id,
      user_id: data.user_id, // Vem do token do usuário logado
      status_chamado: 'Aberto'
    };

    // Atualiza o status do equipamento para 'Em Manutenção' automaticamente
    await equipmentRepository.update(equipment.id, { status: 'Em Manutenção' });

    return await ticketRepository.create(ticketData);
  }

  async getAllTickets() {
    return await ticketRepository.findAll();
  }

  async resolveTicket(id, resolucao_ti) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new Error('Chamado não encontrado.');

    // Atualiza o chamado para concluído
    const updatedTicket = await ticketRepository.update(id, {
      status_chamado: 'Concluído',
      resolucao_ti
    });

    // Devolve o equipamento para o status 'Disponível' ou 'Em Uso'
    await equipmentRepository.update(ticket.equipment_id, { status: 'Disponível' });

    return updatedTicket;
  }
}

module.exports = new TicketService();