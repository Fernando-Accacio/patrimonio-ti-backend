'use strict';
const bcrypt = require('bcrypt');
require('dotenv').config();
const { encryptEmail } = require('../../../../core/utils/auth.utils');

module.exports = {
  async up(queryInterface, Sequelize) {
    const senhaAdminBruta = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
    const hashAdmin = await bcrypt.hash(senhaAdminBruta, 10);

    const usuarios = [
      {
        nome: 'Administrador TI',
        email: encryptEmail('admin@itapecerica.sp.gov.br'),
        senha: hashAdmin,
        role: 'ADMIN',
        ramal: '2101',
        matricula: '10001',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('Users', usuarios, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};