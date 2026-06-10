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
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false // 🌟 CORREÇÃO: Traz o solicitante histórico mesmo se foi removido!
        },
        { 
          model: User, 
          as: 'tecnico', 
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false // 🌟 CORREÇÃO: Traz o técnico histórico mesmo se foi removido!
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await Ticket.findByPk(id, {
      include: [
        { model: Equipment, as: 'equipment' },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false // 🌟 CORREÇÃO: Garante o histórico na busca por ID
        },
        { 
          model: User, 
          as: 'tecnico', 
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false // 🌟 CORREÇÃO: Garante o histórico na busca por ID
        }
      ]
    });
  }

  async update(id, updateData) {
    await Ticket.update(updateData, { where: { id } });
    return await this.findById(id);
  }
}

module.exports = new TicketRepository();