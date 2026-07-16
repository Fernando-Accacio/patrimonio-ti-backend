'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Adiciona a chave estrangeira para o Tipo de Equipamento
    await queryInterface.addColumn('Equipment', 'equipment_type_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Permitir nulo inicialmente para não quebrar dados legados se houver
      references: {
        model: 'EquipmentTypes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. Adiciona a chave estrangeira para o Setor
    await queryInterface.addColumn('Equipment', 'sector_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Sectors',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3. Remove a coluna 'tipo' e 'observacao' antigas que agora serão dinâmicas (observacao era usada para setor/localização)
    await queryInterface.removeColumn('Equipment', 'tipo');
  },

  async down(queryInterface, Sequelize) {
    // Reverter as alterações caso necessário
    await queryInterface.addColumn('Equipment', 'tipo', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.removeColumn('Equipment', 'sector_id');
    await queryInterface.removeColumn('Equipment', 'equipment_type_id');
  }
};