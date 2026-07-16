'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Equipment extends Model {
    static associate(models) {
      Equipment.hasMany(models.Ticket, { foreignKey: 'equipment_id', as: 'tickets' });
      
      // 🌟 Declarando as novas relações para o Sequelize entender
      Equipment.belongsTo(models.Sector, { foreignKey: 'sector_id', as: 'sector' });
      Equipment.belongsTo(models.EquipmentType, { foreignKey: 'equipment_type_id', as: 'equipmentType' });
    }
  }
  Equipment.init({
    patrimonio: DataTypes.STRING,
    status: DataTypes.STRING,
    criado_por: DataTypes.STRING,
    equipment_type_id: DataTypes.INTEGER, // 🌟 Substituiu o 'tipo'
    sector_id: DataTypes.INTEGER          // 🌟 Substituiu a 'observacao' (localização)
  }, {
    sequelize,
    modelName: 'Equipment',
    tableName: 'Equipment',
    paranoid: true
  });
  return Equipment;
};