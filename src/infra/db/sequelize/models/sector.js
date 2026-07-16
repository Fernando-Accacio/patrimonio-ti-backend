'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sector extends Model {
    static associate(models) {
      Sector.hasMany(models.Equipment, { foreignKey: 'sector_id', as: 'equipments' });
    }
  }
  Sector.init({
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
    modelName: 'Sector',
    tableName: 'Sectors'
  });
  return Sector;
};