'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'primeira_senha', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'primeira_senha');
  }
};