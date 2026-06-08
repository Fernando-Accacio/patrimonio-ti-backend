'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'ramal', {
      type: Sequelize.STRING,
      allowNull: false, // Torna obrigatório no banco
      defaultValue: 'Não informado' // Valor padrão temporário caso já existam dados
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'ramal');
  }
};