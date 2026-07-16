'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EquipmentType extends Model {
    static associate(models) {
      EquipmentType.hasMany(models.Equipment, { foreignKey: 'equipment_type_id', as: 'equipments' });
    }
  }
  EquipmentType.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    prefixo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'EquipmentType',
    tableName: 'EquipmentTypes'
  });
  return EquipmentType;
};