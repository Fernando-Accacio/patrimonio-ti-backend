const { Ticket, Equipment, User } = require('../models');

class TicketRepository {
  async create(ticketData) {
    return await Ticket.create(ticketData);
  }

  async findAll() {
    // 🌟 ESPIÃO: Isso vai imprimir no terminal do backend exatamente as colunas que o Node reconhece
    console.log("=== COLUNAS QUE O NODE ESTÁ LENDO ===", Object.keys(Ticket.rawAttributes));

    return await Ticket.findAll({
      // 🌟 FORÇA BRUTA: Declarando o array explícito com a coluna nova
      attributes: [
        'id', 'descricao_problema', 'status_chamado', 'resolucao_ti', 
        'data_abertura', 'equipment_id', 'user_id', 'tecnico_id', 
        'finished_by', 'confirmed_by', 'rejection_reason', 'finished_at', 
        'codigo_processo', 'createdAt', 'updatedAt', 'deletedAt'
      ],
      include: [
        { model: Equipment, as: 'equipment' },
        { model: User, as: 'user', attributes: ['id', 'nome', 'email', 'ramal'], paranoid: false },
        { model: User, as: 'tecnico', attributes: ['id', 'nome', 'email', 'ramal'], paranoid: false },
        { model: User, as: 'finalizador', attributes: ['id', 'nome', 'email', 'ramal'], paranoid: false },
        { model: User, as: 'confirmador', attributes: ['id', 'nome', 'email', 'ramal'], paranoid: false }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id) {
    return await Ticket.findByPk(id, {
      // 🌟 REMOVEMOS O 'attributes' daqui também
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
        },
        {
          model: User,
          as: 'finalizador',
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false
        },
        {
          model: User,
          as: 'confirmador',
          attributes: ['id', 'nome', 'email', 'ramal'],
          paranoid: false
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