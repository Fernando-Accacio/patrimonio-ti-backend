const { Ticket, Equipment, User } = require('../models');

class TicketRepository {
  async create(ticketData) {
    return await Ticket.create(ticketData);
  }

  async findAll() {
    return await Ticket.findAll({
      include: [
        { model: Equipment, as: 'equipment' },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'nome', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await Ticket.findByPk(id, {
      include: [
        { model: Equipment, as: 'equipment' },
        { model: User, as: 'user', attributes: ['id', 'nome', 'email'] }
      ]
    });
  }

  async update(id, updateData) {
    await Ticket.update(updateData, { where: { id } });
    return await this.findById(id);
  }
}

module.exports = new TicketRepository();