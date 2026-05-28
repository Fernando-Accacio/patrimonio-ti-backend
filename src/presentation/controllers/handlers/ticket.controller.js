const ticketService = require('../../../application/services/ticket.service');

exports.open = async (req, res) => {
  try {
    const data = { ...req.body, user_id: req.user.id };
    const ticket = await ticketService.openTicket(data);
    return res.status(201).send(ticket);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

exports.listAll = async (req, res) => {
  const tickets = await ticketService.getAllTickets();
  return res.send(tickets);
};

exports.resolve = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolucao_ti } = req.body;
    const ticket = await ticketService.resolveTicket(id, resolucao_ti);
    return res.send(ticket);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao_problema } = req.body;
    
    const ticketAtualizado = await ticketService.updateTicketDescription(id, descricao_problema);
    return res.send(ticketAtualizado);
  } catch (e) { 
    res.status(400).send({ error: e.message }); 
  }
};

exports.listMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { Ticket, Equipment } = require('../../../infra/db/sequelize/models');
    const tickets = await Ticket.findAll({ 
      where: { user_id: userId },
      include: [{ model: Equipment, as: 'equipment' }]
    });
    return res.send(tickets);
  } catch (e) { res.status(500).send({ error: e.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_chamado, resolucao_ti } = req.body;
    
    const ticket = await ticketService.updateTicketStatus(id, status_chamado, resolucao_ti);
    return res.send(ticket);
  } catch (e) { 
    res.status(400).send({ error: e.message }); 
  }
};