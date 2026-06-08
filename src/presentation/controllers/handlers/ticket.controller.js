const ticketService = require('../../../application/services/ticket.service');
const sseService = require('../../../application/services/sse.service');

class TicketController {
  async open(req, res) {
    try {
      const data = { 
        ...req.body, 
        user_id: req.user.id,
        tecnico_id: req.body.tecnico_id || null 
      };
      const ticket = await ticketService.openTicket(data);
      return res.status(201).send(ticket);
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async listAll(req, res) {
    try {
      const tickets = await ticketService.getAllTickets();
      return res.status(200).send(tickets);
    } catch (e) { return res.status(500).send({ error: 'Erro ao listar chamados.' }); }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const ticketAtualizado = await ticketService.updateTicketInfo(id, req.body);
      return res.status(200).send(ticketAtualizado);
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async listMyTickets(req, res) {
    try {
      // Toda a query complexa agora roda limpa dentro do Service!
      const tickets = await ticketService.getMyTickets(req.user.id, req.user.role);
      return res.status(200).send(tickets);
    } catch (e) { return res.status(500).send({ error: e.message }); }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status_chamado, resolucao_ti } = req.body;
      const ticket = await ticketService.updateTicketStatus(id, status_chamado, resolucao_ti);
      return res.status(200).send(ticket);
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async assignTechnician(req, res) {
    try {
      const { id } = req.params;
      const { tecnico_id } = req.body;

      const ticket = await ticketService.assignTechnician(id, tecnico_id); // Service orquestra!
      sseService.broadcast({ action: 'RELOAD_DATA' });
      return res.status(200).send(ticket);
    } catch (e) { return res.status(400).send({ error: 'Erro ao atribuir técnico: ' + e.message }); }
  }

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const userId = req.user.id;

      const ticket = await ticketService.cancelTicket(id, userId, motivo);
      return res.status(200).send(ticket);
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }
}

module.exports = new TicketController();