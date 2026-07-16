const ticketRepository = require('../../infra/db/sequelize/repository/ticket.repository');
const equipmentRepository = require('../../infra/db/sequelize/repository/equipment.repository');
const sseService = require('./sse.service');
const { Sector, EquipmentType } = require('../../infra/db/sequelize/models');

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

  // 🌟 FUNÇÃO AUXILIAR PARA GERAR O CÓDIGO DE PROCESSO
  _gerarCodigoProcesso(setor, tipoEquipamento) {
    // Mapeamento de setores comuns para garantir siglas padronizadas
    const mapeamentoSetores = {
      'recursos humanos': 'RH',
      'tecnologia da informacao': 'TI',
      'tecnologia da informação': 'TI',
      'financeiro': 'FIN',
      'almoxarifado': 'ALM',
      'almoxarifado central': 'ALM',
      'comercial': 'COM',
      'administrativo': 'ADM',
      'faturamento': 'FAT',
      'gabinete do prefeito': 'GAB',
      'gabinete': 'GAB',
      'saude': 'SAU',
      'saúde': 'SAU',
      'educacao': 'EDU',
      'educação': 'EDU'
    };

    const normalizedSetor = String(setor || '').trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos

    let siglaSetor = mapeamentoSetores[normalizedSetor];
    
    if (!siglaSetor) {
      // Se for um setor customizado digitado, gera uma sigla inteligente com as primeiras letras
      siglaSetor = normalizedSetor
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
      
      if (siglaSetor.length < 2) {
        siglaSetor = (normalizedSetor.slice(0, 3) || 'GEN').toUpperCase();
      }
    }

    // Mapeamento de tipo de equipamento para sua respectiva letra inicial
    const mapeamentoEquipamentos = {
      'computador desktop': 'C',
      'notebook': 'N',
      'impressora': 'I',
      'monitor': 'M',
      'telefone ip': 'T',
      'projetor': 'P',
      'outro': 'O'
    };

    const normalizedTipo = String(tipoEquipamento || '').trim().toLowerCase();
    const inicialEquipamento = mapeamentoEquipamentos[normalizedTipo] || 'E'; // 'E' de equipamento genérico

    // Gera um número aleatório de 5 dígitos para garantir unicidade
    const numAleatorio = Math.floor(10000 + Math.random() * 90000);

    return `${siglaSetor}-${inicialEquipamento}${numAleatorio}`;
  }

  async openTicket(data) {
    // 🌟 1. Busca os dados reais no banco usando os IDs enviados pelo front
    const setor = await Sector.findByPk(data.sector_id);
    const tipoEqp = await EquipmentType.findByPk(data.equipment_type_id);

    if (!setor || !tipoEqp) throw new Error('Setor ou Tipo de Equipamento inválido.');

    let equipment = await equipmentRepository.findByPatrimonio(data.patrimonio);
    
    if (!equipment) {
      equipment = await equipmentRepository.create({
        patrimonio: data.patrimonio,
        equipment_type_id: data.equipment_type_id, // 🌟 Salva o ID da FK
        sector_id: data.sector_id,                 // 🌟 Salva o ID da FK
        status: 'Em Manutenção',
        criado_por: 'Usuário (Via Chamado)'
      });
    } else {
      await equipmentRepository.update(equipment.id, { status: 'Em Manutenção' });
    }

    const statusInicial = data.tecnico_id ? 'Em Andamento' : 'Aberto';

    // 🌟 2. Passa os NOMES para a sua função, mantendo o padrão das siglas intacto!
    const codigoProcesso = this._gerarCodigoProcesso(setor.nome, tipoEqp.nome);

    const newTicket = await ticketRepository.create({
      descricao_problema: data.descricao_problema,
      equipment_id: equipment.id,
      user_id: data.user_id,
      status_chamado: statusInicial, 
      tecnico_id: data.tecnico_id || null,
      data_abertura: new Date(), 
      codigo_processo: codigoProcesso
    });
    
    sseService.broadcast({ action: 'RELOAD_DATA' }); 
    return newTicket;
  }

  async cancelTicket(id, userId, motivo) {
    const ticket = await this._buscarChamadoOuFalhar(id);

    if (ticket.user_id !== userId) {
      throw new Error('Acesso negado: apenas o solicitante pode cancelar este chamado.');
    }

    if (['Concluído', 'Baixa', 'Cancelado'].includes(ticket.status_chamado)) {
      throw new Error('Chamados finalizados ou já cancelados não podem ser alterados.');
    }

    const payload = {
      status_chamado: 'Cancelado',
      // Guarda o motivo do cancelamento para histórico
      resolucao_ti: `${ticket.resolucao_ti || ''}\n\n[CANCELADO PELO USUÁRIO]: ${motivo}`.trim(),
      finished_by: userId,
      finished_at: new Date()
    };

    const updatedTicket = await ticketRepository.update(id, payload);
    
    // Libera o equipamento novamente
    await equipmentRepository.update(ticket.equipment_id, { status: 'Disponível' });

    sseService.broadcast({ action: 'RELOAD_DATA' });
    return updatedTicket;
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

    if (['Concluído', 'Baixa'].includes(ticket.status_chamado)) {
      throw new Error('Operação negada: Chamados finalizados não podem ser editados.');
    }

    // 🌟 CAPTURA E SALVA A RESPOSTA DO USUÁRIO NO HISTÓRICO DE RESOLUÇÃO
    let resolucao_ti = ticket.resolucao_ti || '';
    if (data.resposta_observacao) {
      resolucao_ti += `\n\n[CONFIRMAÇÃO DO USUÁRIO]: ${data.resposta_observacao}`;
    }

    let equipment_id = ticket.equipment_id;

    if (data.patrimonio) {
      const equipmentDestino = await equipmentRepository.findByPatrimonio(data.patrimonio);
      
      // 🌟 Ajustado para usar os novos IDs (equipment_type_id e sector_id)
      if (!equipmentDestino) {
        await equipmentRepository.update(equipment_id, {
          patrimonio: data.patrimonio,
          equipment_type_id: data.equipment_type_id,
          sector_id: data.sector_id,
          criado_por: 'Usuário (Via Chamado)'
        });
      } else {
        await equipmentRepository.update(equipmentDestino.id, {
          equipment_type_id: data.equipment_type_id || equipmentDestino.equipment_type_id,
          sector_id: data.sector_id || equipmentDestino.sector_id
        });
        equipment_id = equipmentDestino.id;
      }
    }

    const updatePayload = { 
      descricao_problema: data.descricao_problema,
      equipment_id,
      resolucao_ti 
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

    if (statusSolicitado === 'Aguardando Confirmação') {
      payload.finished_by = usuario_logado_id;
      // 🌟 DATA DE FECHAMENTO (Será diferente da data de abertura!)
      payload.finished_at = new Date(); 
      payload.confirmed_by = null;
    }

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
        resolucao_ti: `${ticket.resolucao_ti}\n\n[RECUSADO PELO USUÁRIO]: ${motivo}`,
        rejection_reason: motivo,
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
          paranoid: false 
        },
        { 
          model: User, 
          as: 'tecnico', 
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async assignTechnician(id, tecnico_id) {
    const ticket = await this._buscarChamadoOuFalhar(id);
    
    // Converte para número se existir, senão define como null
    const cleanTecnicoId = tecnico_id && tecnico_id !== "" ? parseInt(tecnico_id, 10) : null;
    
    const updatePayload = { tecnico_id: cleanTecnicoId };

    if (ticket.status_chamado === 'Aberto' && cleanTecnicoId) {
      updatePayload.status_chamado = 'Em Andamento';
    } else if (ticket.status_chamado === 'Em Andamento' && !cleanTecnicoId) {
      updatePayload.status_chamado = 'Aberto';
    }

    return await ticketRepository.update(id, updatePayload);
  }

  async devolverChamado(id, adminId, observacao, patrimonioAtualizado) {
    const ticket = await this._buscarChamadoOuFalhar(id);

    if (['Concluído', 'Baixa', 'Cancelado'].includes(ticket.status_chamado)) {
      throw new Error('Chamados finalizados não podem ser alterados.');
    }

    let payload = {};
    let equipment_id = ticket.equipment_id;

    // 1. Atualizar o Patrimônio se ele foi alterado no modal
    if (patrimonioAtualizado) {
      const equipmentDestino = await equipmentRepository.findByPatrimonio(patrimonioAtualizado);
      if (!equipmentDestino) {
        // Se o patrimônio digitado não existe, altera o atual (corrige o erro de digitação do usuário)
        await equipmentRepository.update(equipment_id, { patrimonio: patrimonioAtualizado });
      } else {
        // Se o patrimônio já existe no banco, apenas vincula o chamado a ele
        equipment_id = equipmentDestino.id;
        payload.equipment_id = equipment_id;
      }
    }

    // 2. Se o Admin escreveu uma observação, devolve pra fila
    if (observacao && observacao.trim() !== '') {
      payload.status_chamado = 'Aberto';
      payload.tecnico_id = null; // Remove do técnico, pois voltou pro suporte nível 1
      payload.resolucao_ti = `${ticket.resolucao_ti || ''}\n\n[OBSERVAÇÃO DO SUPORTE]: ${observacao}`.trim();
    }

    // Salva as alterações no banco
    const updatedTicket = await ticketRepository.update(id, payload);
    return updatedTicket;
  }

  async autoClosePendingTickets() {
    const { Ticket, Equipment } = require('../../infra/db/sequelize/models');
    const { Op } = require('sequelize');

    const limiteDias = new Date();
    limiteDias.setDate(limiteDias.getDate() - 3);

    try {
      const ticketsPendentes = await Ticket.findAll({
        where: {
          status_chamado: 'Aguardando Confirmação',
          finished_at: {
            [Op.lt]: limiteDias 
          }
        }
      });

      if (ticketsPendentes.length === 0) return;

      for (const ticket of ticketsPendentes) {
        await ticket.update({
          status_chamado: 'Concluído',
          resolucao_ti: `${ticket.resolucao_ti}\n\n[SISTEMA]: Chamado finalizado automaticamente após 3 dias sem confirmação do solicitante.`,
          confirmed_by: null 
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