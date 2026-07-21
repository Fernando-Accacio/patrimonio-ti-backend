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
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    primeira_senha: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
    senha: DataTypes.STRING,
    role: DataTypes.STRING,
    ramal: DataTypes.STRING,
    matricula: {
      type: DataTypes.STRING,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'User',
    paranoid: true
  });
  return User;
};