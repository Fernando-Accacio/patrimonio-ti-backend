'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Cadastra alguns Setores (Sectors) de teste com seus respectivos prefixos
    await queryInterface.bulkInsert('Sectors', [
      {
        id: 1,
        nome: 'Gabinete do Prefeito',
        prefixo: 'GAB',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        nome: 'Secretaria de Finanças',
        prefixo: 'FIN',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        nome: 'Secretaria de Saúde',
        prefixo: 'SAU',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // 2. Cadastra alguns Tipos de Equipamentos (EquipmentTypes) com seus prefixos
    await queryInterface.bulkInsert('EquipmentTypes', [
      {
        id: 1,
        nome: 'Computador Desktop',
        prefixo: 'COMP',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        nome: 'Notebook',
        prefixo: 'NOTE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        nome: 'Impressora',
        prefixo: 'IMP',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // 3. Cadastra os Equipamentos (Equipment) vinculando-os aos tipos e setores criados acima
    await queryInterface.bulkInsert('Equipment', [
      {
        id: 1,
        patrimonio: '1002001',
        status: 'ATIVO',
        observacao: 'Mesa da recepção principal',
        criado_por: 'admin@itapecerica.sp.gov.br',
        equipment_type_id: 1, // Computador Desktop
        sector_id: 1,         // Gabinete do Prefeito
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        patrimonio: '1002002',
        status: 'ATIVO',
        observacao: 'Sala de reuniões da contabilidade',
        criado_por: 'admin@itapecerica.sp.gov.br',
        equipment_type_id: 2, // Notebook
        sector_id: 2,         // Secretaria de Finanças
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        patrimonio: '1002003',
        status: 'ATIVO',
        observacao: 'Balcão de atendimento do postinho',
        criado_por: 'admin@itapecerica.sp.gov.br',
        equipment_type_id: 3, // Impressora
        sector_id: 3,         // Secretaria de Saúde
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    // Ordem inversa para evitar problemas de chaves estrangeiras ao reverter
    await queryInterface.bulkDelete('Equipment', null, {});
    await queryInterface.bulkDelete('EquipmentTypes', null, {});
    await queryInterface.bulkDelete('Sectors', null, {});
  }
};