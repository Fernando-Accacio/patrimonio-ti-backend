'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Equipment extends Model {
    static associate(models) {
      Equipment.hasMany(models.Ticket, { foreignKey: 'equipment_id', as: 'tickets' });
    }
  }
  Equipment.init({
    patrimonio: DataTypes.STRING,
    tipo: DataTypes.STRING,
    status: DataTypes.STRING,
    observacao: DataTypes.STRING,
    criado_por: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Equipment',
    tableName: 'Equipment',
    paranoid: true
  });
  return Equipment;
};