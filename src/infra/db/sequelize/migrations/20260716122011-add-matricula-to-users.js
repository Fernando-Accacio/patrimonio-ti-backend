'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'matricula', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true // Permitimos null inicialmente para não quebrar os usuários que já estão cadastrados sem matrícula
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'matricula');
  }
};