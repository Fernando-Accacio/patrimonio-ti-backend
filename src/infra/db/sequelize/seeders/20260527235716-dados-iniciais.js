'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Gera a senha criptografada para o Admin padrão
    const hashedPassword = await bcrypt.hash('senha-super-segura', 10);

    // 2. Insere o Usuário Admin inicial se ele não existir
    await queryInterface.bulkInsert('Users', [{
      nome: 'Administrador TI',
      email: 'admin@prefeitura.sp.gov.br',
      senha: hashedPassword,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // 3. Insere alguns Equipamentos de exemplo para o sistema já iniciar com dados visíveis
    await queryInterface.bulkInsert('Equipment', [
      {
        patrimonio: 'PM-2026-001',
        tipo: 'Computador Desktop',
        status: 'Disponível',
        observacao: 'Gabinete Dell, Secretaria de Administração',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        patrimonio: 'PM-2026-002',
        tipo: 'Impressora Laser',
        status: 'Disponível',
        observacao: 'HP LaserJet, Setor de Finanças',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        patrimonio: 'PM-2026-003',
        tipo: 'Projetor',
        status: 'Disponível',
        observacao: 'Projetor Epson, Auditório Principal',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    // Comando para limpar os dados caso queira reverter o seeder
    await queryInterface.bulkDelete('Users', { email: 'admin@prefeitura.sp.gov.br' }, {});
    await queryInterface.bulkDelete('Equipment', null, {});
  }
};