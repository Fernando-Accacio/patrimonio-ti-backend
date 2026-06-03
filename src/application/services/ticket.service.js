const ticketRepository = require('../../infra/db/sequelize/repository/ticket.repository');
const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');
const sseService = require('./sse.service');

class TicketService {
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

    const ticketData = {
      descricao_problema: data.descricao_problema,
      equipment_id: equipment.id,
      user_id: data.user_id,
      status_chamado: 'Aberto',
      tecnico_id: data.tecnico_id || null // <-- CORRIGIDO AQUI: Agora ele salva o técnico na criação!
    };

    const newTicket = await ticketRepository.create(ticketData);
    
    sseService.broadcast({ action: 'RELOAD_DATA' }); 
    return newTicket;
  }

  async getAllTickets() {
    return await ticketRepository.findAll();
  }

// NOVA FUNÇÃO: Permite editar o chamado por completo com lógica inteligente de patrimônio
  async updateTicketInfo(id, data) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new Error('Chamado não encontrado.');

    if (ticket.status_chamado === 'Concluído' || ticket.status_chamado === 'Baixa') {
      throw new Error('Operação negada: Chamados finalizados não podem ser editados.');
    }

    let equipment_id = ticket.equipment_id;

    if (data.patrimonio) {
      let equipmentDestino = await equipmentRepository.findByPatrimonio(data.patrimonio);

      if (!equipmentDestino) {
        // Cenário 1: O patrimônio não existe. Foi um erro de digitação!
        // Atualiza a máquina atual em vez de criar uma nova.
        await equipmentRepository.update(equipment_id, {
          patrimonio: data.patrimonio,
          tipo: data.tipo,
          observacao: data.localizacao,
          criado_por: 'Usuário (Via Chamado)'
        });
      } else {
        // Cenário 2: O usuário alterou para uma máquina que já existe no banco.
        // Vincula o chamado a ela e atualiza suas informações.
        await equipmentRepository.update(equipmentDestino.id, {
          tipo: data.tipo || equipmentDestino.tipo,
          observacao: data.localizacao || equipmentDestino.observacao
        });
        equipment_id = equipmentDestino.id;
      }
    }

    // Prepara os dados do chamado para atualizar
    const updatePayload = { 
      descricao_problema: data.descricao_problema,
      equipment_id: equipment_id 
    };

    // CORRIGIDO AQUI: Se o Frontend mandou a propriedade do técnico na edição, nós a incluímos no pacote!
    if ('tecnico_id' in data) {
      updatePayload.tecnico_id = data.tecnico_id;
    }

    const updated = await ticketRepository.update(id, updatePayload);
    
    sseService.broadcast({ action: 'RELOAD_DATA' });
    return updated;
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
    
    sseService.broadcast({ action: 'RELOAD_DATA' }); // <-- Atualiza a tela
    return updatedTicket;
  }

  async cancelTicket(id, userId, motivo) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new Error('Chamado não encontrado.');
    if (ticket.user_id !== userId) throw new Error('Acesso negado: Você só pode cancelar seus próprios chamados.');
    if (ticket.status_chamado !== 'Aberto') throw new Error('Apenas chamados que ainda estão "Abertos" podem ser cancelados.');

    // Atualiza o chamado
    const updatedTicket = await ticketRepository.update(id, {
      status_chamado: 'Cancelado',
      resolucao_ti: `Cancelado pelo usuário. Justificativa: ${motivo}`
    });

    // Libera o equipamento atrelado para voltar a ficar Disponível
    await equipmentRepository.update(ticket.equipment_id, { status: 'Disponível' });

    sseService.broadcast({ action: 'RELOAD_DATA' });
    return updatedTicket;
  }
}

module.exports = new TicketService();