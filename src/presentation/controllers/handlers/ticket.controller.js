const ticketService = require('../../../application/services/ticket.service');
const ticketRepository = require('../../../infra/db/sequelize/repository/ticket.repository'); 
const sseService = require('../../../application/services/sse.service');

class TicketController {
  async open(req, res) {
    try {
      // Repassa o técnico se ele existir
      const data = { 
        ...req.body, 
        user_id: req.user.id,
        tecnico_id: req.body.tecnico_id || null 
      };
      const ticket = await ticketService.openTicket(data);
      
      // Dispara a atualização para a tela do técnico e do admin atualizar na hora
      sseService.broadcast({ action: 'RELOAD_DATA' });
      
      return res.status(201).send(ticket);
    } catch (e) { 
      return res.status(400).send({ error: e.message }); 
    }
  }

  async listAll(req, res) {
    try {
      const tickets = await ticketService.getAllTickets();
      return res.status(200).send(tickets);
    } catch (e) {
      return res.status(500).send({ error: 'Erro ao listar chamados.' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      
      // Repassa todo o corpo da requisição (incluindo o tecnico_id)
      const ticketAtualizado = await ticketService.updateTicketInfo(id, req.body);
      
      // SSE para recarregar tabelas ao vivo
      sseService.broadcast({ action: 'RELOAD_DATA' });
      
      return res.status(200).send(ticketAtualizado);
    } catch (e) { 
      return res.status(400).send({ error: e.message }); 
    }
  }

  async listMyTickets(req, res) {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      const { Ticket, Equipment, User } = require('../../../infra/db/sequelize/models');
      
      // Se for TECH, busca chamados atribuídos a ele E os que ele abriu.
      // Se for USER, busca só os que ele abriu.
      const whereCondition = role === 'TECH' 
        ? { [require('sequelize').Op.or]: [{ tecnico_id: userId }, { user_id: userId }] }
        : { user_id: userId };

      const tickets = await Ticket.findAll({ 
        where: whereCondition,
        include: [
          { model: Equipment, as: 'equipment' },
          { model: User, as: 'tecnico', attributes: ['id', 'nome'] }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.status(200).send(tickets);
    } catch (e) { 
      return res.status(500).send({ error: e.message }); 
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status_chamado, resolucao_ti } = req.body;
      const ticket = await ticketService.updateTicketStatus(id, status_chamado, resolucao_ti);
      return res.status(200).send(ticket);
    } catch (e) { 
      return res.status(400).send({ error: e.message }); 
    }
  }

  // NOVO MÉTODO: Atribuição de técnico
  async assignTechnician(req, res) {
    try {
      const { id } = req.params;
      const { tecnico_id } = req.body;

      // Poderíamos colocar isso no service, mas para agilizar e manter o escopo:
      const ticket = await ticketRepository.update(id, { tecnico_id });
      
      // Dispara atualização via SSE para todos verem a mudança
      sseService.broadcast({ action: 'RELOAD_DATA' });

      return res.status(200).send(ticket);
    } catch (e) {
      return res.status(400).send({ error: 'Erro ao atribuir técnico: ' + e.message });
    }
  }

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const userId = req.user.id;

      const ticket = await ticketService.cancelTicket(id, userId, motivo);
      return res.status(200).send(ticket);
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  }
}

module.exports = new TicketController();