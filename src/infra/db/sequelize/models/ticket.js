'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ticket extends Model {
    static associate(models) {
      Ticket.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Ticket.belongsTo(models.User, { foreignKey: 'tecnico_id', as: 'tecnico' });
      Ticket.belongsTo(models.Equipment, { foreignKey: 'equipment_id', as: 'equipment' });
      
      // 🌟 NOVAS ASSOCIAÇÕES
      Ticket.belongsTo(models.User, { foreignKey: 'finished_by', as: 'finalizador' });
      Ticket.belongsTo(models.User, { foreignKey: 'confirmed_by', as: 'confirmador' });
    }
  }
  
  Ticket.init({
    descricao_problema: DataTypes.TEXT,
    status_chamado: DataTypes.STRING,
    resolucao_ti: DataTypes.TEXT,
    data_abertura: DataTypes.DATE,
    equipment_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    tecnico_id: DataTypes.INTEGER,
    // 🌟 NOVAS COLUNAS
    finished_by: DataTypes.INTEGER,
    confirmed_by: DataTypes.INTEGER,
    rejection_reason: DataTypes.TEXT,
    finished_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Ticket',
    paranoid: true
  });
  
  return Ticket;
};