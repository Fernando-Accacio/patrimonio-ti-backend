const ticketRepository = require('../../infra/db/sequelize/repository/ticket.repository');
const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');
const sseService = require('./sse.service');

const STATUS_EQUIPAMENTO_MAP = {
  'Concluído': 'Disponível',
  'Baixa': 'Baixa'
};

class TicketService {
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

    const statusInicial = data.tecnico_id ? 'Em Andamento' : 'Aberto';

    const newTicket = await ticketRepository.create({
      descricao_problema: data.descricao_problema,
      equipment_id: equipment.id,
      user_id: data.user_id,
      status_chamado: statusInicial, 
      tecnico_id: data.tecnico_id || null
    });
    
    sseService.broadcast({ action: 'RELOAD_DATA' }); 
    return newTicket;
  }

  async getAllTickets() {
    return await ticketRepository.findAll();
  }

  async updateTicketInfo(id, data, userId, role) {
    const ticket = await this._buscarChamadoOuFalhar(id);
    const isAdmin = String(role || '').trim().toUpperCase() === 'ADMIN';

    if (!isAdmin && ticket.user_id !== userId) {
      throw new Error('Acesso negado: apenas o solicitante pode editar este chamado.');
    }

    if (String(role || '').trim().toUpperCase() === 'TECH' && 'tecnico_id' in data) {
      throw new Error('Acesso negado: o suporte não pode assumir chamados.');
    }

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

    if ('tecnico_id' in data) {
      updatePayload.tecnico_id = data.tecnico_id;
      if (ticket.status_chamado === 'Aberto' && data.tecnico_id) {
        updatePayload.status_chamado = 'Em Andamento';
      }
    }

    const updated = await ticketRepository.update(id, updatePayload);
    sseService.broadcast({ action: 'RELOAD_DATA' });
    return updated;
  }

  async updateTicketStatus(id, status_chamado, resolucao_ti, usuario_logado_id) {
    const ticket = await this._buscarChamadoOuFalhar(id);
    const statusSolicitado = status_chamado === 'Concluído' ? 'Aguardando Confirmação' : status_chamado;

    const payload = {
      status_chamado: statusSolicitado,
      resolucao_ti: resolucao_ti || ticket.resolucao_ti
    };

    // 🌟 SE O TÉCNICO/ADMIN ENVIOU PARA CONFIRMAÇÃO
    if (statusSolicitado === 'Aguardando Confirmação') {
      payload.finished_by = usuario_logado_id;
      payload.finished_at = new Date();
      payload.confirmed_by = null;
    }

    // Mantemos a segurança caso o admin dê "Baixa" direto
    if (statusSolicitado === 'Baixa') {
      payload.finished_by = usuario_logado_id;
      payload.finished_at = new Date();
      payload.confirmed_by = null; 
    }

    const updatedTicket = await ticketRepository.update(id, payload);

    const equipamentoStatus = STATUS_EQUIPAMENTO_MAP[statusSolicitado] || 'Em Manutenção';
    await equipmentRepository.update(ticket.equipment_id, { status: equipamentoStatus });
    
    sseService.broadcast({ action: 'RELOAD_DATA' }); 
    return updatedTicket;
  }

  async responderConfirmacao(id, userId, aprovado, motivo) {
    const ticket = await this._buscarChamadoOuFalhar(id);

    if (ticket.user_id !== userId) throw new Error('Acesso negado: Apenas o solicitante pode confirmar a resolução.');
    if (ticket.status_chamado !== 'Aguardando Confirmação') throw new Error('Este chamado não está aguardando confirmação.');

    let payload = {};

    if (aprovado) {
      const comentarioConfirmacao = motivo?.trim();
      payload = {
        status_chamado: 'Concluído',
        confirmed_by: userId,
        finished_by: ticket.finished_by,
        finished_at: ticket.finished_at,
        resolucao_ti: comentarioConfirmacao
          ? `${ticket.resolucao_ti || ''}\n\n[CONFIRMAÇÃO DO USUÁRIO]: ${comentarioConfirmacao}`
          : ticket.resolucao_ti
      };
    } else {
      payload = {
        status_chamado: 'Em Andamento',
        // Registra o que faltou no log de resolução para o técnico ver
        resolucao_ti: `${ticket.resolucao_ti}\n\n[RECUSADO PELO USUÁRIO]: ${motivo}`,
        rejection_reason: motivo,
        // Limpa os dados de finalização para o técnico poder finalizar de novo
        finished_by: null, 
        finished_at: null,
        confirmed_by: null
      };
    }

    const updatedTicket = await ticketRepository.update(id, payload);
    
    if (aprovado) {
      await equipmentRepository.update(ticket.equipment_id, { status: 'Disponível' });
    }

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
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false // 🌟 FIX: Mantém o Solicitante mesmo se removido
        },
        { 
          model: User, 
          as: 'tecnico', 
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false // 🌟 FIX: Mantém o Técnico mesmo se removido
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async assignTechnician(id, tecnico_id) {
    const ticket = await this._buscarChamadoOuFalhar(id);
    
    const cleanTecnicoId = tecnico_id && tecnico_id !== "" ? parseInt(tecnico_id, 10) : null;
    
    const updatePayload = { tecnico_id: cleanTecnicoId };

    if (ticket.status_chamado === 'Aberto' && cleanTecnicoId) {
      updatePayload.status_chamado = 'Em Andamento';
    } else if (ticket.status_chamado === 'Em Andamento' && !cleanTecnicoId) {
      updatePayload.status_chamado = 'Aberto';
    }

    return await ticketRepository.update(id, updatePayload);
  }

  async autoClosePendingTickets() {
    const { Ticket, Equipment } = require('../../infra/db/sequelize/models');
    const { Op } = require('sequelize');

    // Calcula a data de 3 dias atrás
    const limiteDias = new Date();
    limiteDias.setDate(limiteDias.getDate() - 3);

    try {
      const ticketsPendentes = await Ticket.findAll({
        where: {
          status_chamado: 'Aguardando Confirmação',
          finished_at: {
            [Op.lt]: limiteDias // A data de finalização tem que ser MENOR (mais antiga) que há 3 dias
          }
        }
      });

      if (ticketsPendentes.length === 0) return;

      for (const ticket of ticketsPendentes) {
        await ticket.update({
          status_chamado: 'Concluído',
          resolucao_ti: `${ticket.resolucao_ti}\n\n[SISTEMA]: Chamado finalizado automaticamente após 3 dias sem confirmação do solicitante.`,
          confirmed_by: null // Indica que não foi o usuário, mas o sistema
        });
        
        await equipmentRepository.update(ticket.equipment_id, { status: 'Disponível' });
      }

      console.log(`[CRON] ${ticketsPendentes.length} chamado(s) finalizados automaticamente.`);
      sseService.broadcast({ action: 'RELOAD_DATA' });

    } catch (error) {
      console.error('[CRON Error] Falha ao auto-finalizar chamados:', error);
    }
  }
}

module.exports = new TicketService();
