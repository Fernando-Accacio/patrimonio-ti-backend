'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Equipment extends Model {
    static associate(models) {
      // 🌟 Usando sequelize.models para evitar undefined por ordem de importação
      Equipment.hasMany(sequelize.models.Ticket, { foreignKey: 'equipment_id', as: 'tickets' });
      Equipment.belongsTo(sequelize.models.Sector, { foreignKey: 'sector_id', as: 'sector' });
      Equipment.belongsTo(sequelize.models.EquipmentType, { foreignKey: 'equipment_type_id', as: 'equipmentType' });
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
    tableName: 'equipment', // Se no seu banco a tabela estiver minúscula (equipment), ajuste aqui
    paranoid: true
  });
  return Equipment;
};