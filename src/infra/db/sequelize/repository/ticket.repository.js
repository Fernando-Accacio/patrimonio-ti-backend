const { Ticket, Equipment, User, Sector, EquipmentType } = require('../models');

class TicketRepository {
  async create(ticketData) {
    return await Ticket.create(ticketData);
  }

  async findAll() {
    return await Ticket.findAll({
      attributes: [
        'id', 'descricao_problema', 'status_chamado', 'resolucao_ti', 
        'data_abertura', 'equipment_id', 'user_id', 'tecnico_id', 
        'finished_by', 'confirmed_by', 'rejection_reason', 'finished_at', 
        'codigo_processo', 'createdAt', 'updatedAt', 'deletedAt'
      ],
      include: [
        { 
          model: Equipment, 
          as: 'equipment',
          // 🌟 AQUI: Incluímos o Setor e o Tipo de Equipamento na busca
          include: [
            { model: EquipmentType, as: 'equipmentType', attributes: ['id', 'nome', 'prefixo'] },
            { model: Sector, as: 'sector', attributes: ['id', 'nome', 'prefixo'] }
          ]
        },
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
      include: [
        { 
          model: Equipment, 
          as: 'equipment',
          // 🌟 AQUI: Incluímos o Setor e o Tipo de Equipamento na busca por ID
          include: [
            { model: EquipmentType, as: 'equipmentType', attributes: ['id', 'nome', 'prefixo'] },
            { model: Sector, as: 'sector', attributes: ['id', 'nome', 'prefixo'] }
          ]
        },
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
    return await this.findById(id); // Agora retorna com Setor e Equipamento completos!
  }
}

module.exports = new TicketRepository();