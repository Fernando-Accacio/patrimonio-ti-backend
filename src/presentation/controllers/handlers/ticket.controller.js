const ticketService = require('../../../application/services/ticket.service');
const ticketRepository = require('../../../infra/db/sequelize/repository/ticket.repository'); // Para listagens exclusivas

class TicketController {
  async open(req, res) {
    try {
      const data = { ...req.body, user_id: req.user.id };
      const ticket = await ticketService.openTicket(data);
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
      // Repassa todo o corpo da requisição (patrimonio, tipo, localizacao e descricao)
      const ticketAtualizado = await ticketService.updateTicketInfo(id, req.body);
      return res.status(200).send(ticketAtualizado);
    } catch (e) { 
      return res.status(400).send({ error: e.message }); 
    }
  }

  async listMyTickets(req, res) {
    try {
      const userId = req.user.id;
      // Idealmente estaria no service, mas delegamos ao repository para manter limpo
      const { Ticket, Equipment } = require('../../../infra/db/sequelize/models');
      const tickets = await Ticket.findAll({ 
        where: { user_id: userId },
        include: [{ model: Equipment, as: 'equipment' }]
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
}

module.exports = new TicketController();