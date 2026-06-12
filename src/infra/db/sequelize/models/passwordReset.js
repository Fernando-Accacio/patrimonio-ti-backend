'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordReset extends Model {
    static associate(models) {
      // Faz o relacionamento: Um pedido de reset PERTENCE a um Usuário
      PasswordReset.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  PasswordReset.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'Pendente' // Pode ser: Pendente, Aprovado, Recusado
    }
  }, {
    sequelize,
    modelName: 'PasswordReset',
  });

  return PasswordReset;
};