'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');

    if (!tableInfo.ramal) {
      await queryInterface.addColumn('Users', 'ramal', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Não informado'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');

    if (tableInfo.ramal) {
      await queryInterface.removeColumn('Users', 'ramal');
    }
  }
};