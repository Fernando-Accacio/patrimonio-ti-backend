'use strict';
const bcrypt = require('bcrypt');
// Importa o utilitário de criptografia para os e-mails nascerem protegidos no banco 🚀
const { encryptEmail } = require('../../../../core/utils/auth.utils');

module.exports = {
  async up(queryInterface, Sequelize) {
    const senhaPadrao = await bcrypt.hash('123456', 10);

    await queryInterface.bulkInsert('Users', [
      {
        nome: 'Administrador TI',
        email: encryptEmail('admin@itapecerica.sp.gov.br'),
        senha: senhaPadrao,
        role: 'ADMIN',
        ramal: '2101', // 🌟 Adicionado ramal institucional
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nome: 'Suporte Técnico',
        email: encryptEmail('suporte@itapecerica.sp.gov.br'),
        senha: senhaPadrao,
        role: 'TECH',
        ramal: '2105', // 🌟 Adicionado ramal institucional
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nome: 'Servidor Padrão',
        email: encryptEmail('servidor@itapecerica.sp.gov.br'),
        senha: senhaPadrao,
        role: 'USER',
        ramal: '2415', // 🌟 Adicionado ramal institucional
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};