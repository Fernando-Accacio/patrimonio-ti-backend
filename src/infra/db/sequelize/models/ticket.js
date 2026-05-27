'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ticket extends Model {
    static associate(models) {
      Ticket.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Ticket.belongsTo(models.Equipment, { foreignKey: 'equipment_id', as: 'equipment' });
    }
  }
  Ticket.init({
    descricao_problema: DataTypes.TEXT,
    status_chamado: DataTypes.STRING,
    resolucao_ti: DataTypes.TEXT,
    data_abertura: DataTypes.DATE,
    equipment_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Ticket',
    paranoid: true
  });
  return Ticket;
};