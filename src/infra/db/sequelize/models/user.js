'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Ticket, { foreignKey: 'user_id', as: 'tickets' });
    }
  }
  User.init({
    nome: DataTypes.STRING,
    email: DataTypes.STRING,
    senha: DataTypes.STRING,
    role: DataTypes.STRING,
    ramal: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
    paranoid: true
  });
  return User;
};