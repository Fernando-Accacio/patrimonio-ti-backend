'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tickets', 'codigo_processo', {
      type: Sequelize.STRING,
      allowNull: true, // Permite null para os chamados antigos não quebrarem
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tickets', 'codigo_processo');
  }
};