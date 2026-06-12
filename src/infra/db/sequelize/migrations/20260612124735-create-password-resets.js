'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PasswordResets', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // ⚠️ ATENÇÃO: Verifique se sua tabela no banco chama "Users" (plural) ou "User". O padrão do Sequelize é plural.
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Se deletar o usuário, apaga o histórico de reset dele também
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'Pendente'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PasswordResets');
  }
};