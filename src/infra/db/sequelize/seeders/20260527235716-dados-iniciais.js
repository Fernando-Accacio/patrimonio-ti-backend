'use strict';
const bcrypt = require('bcrypt');
require('dotenv').config();
const { encryptEmail } = require('../../../../core/utils/auth.utils');

module.exports = {
  async up(queryInterface, Sequelize) {
    const senhaAdminBruta = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
    const senhaTechBruta = process.env.TECH_DEFAULT_PASSWORD || '123456';
    const senhaUserBruta = process.env.USER_DEFAULT_PASSWORD || '123456';

    const hashAdmin = await bcrypt.hash(senhaAdminBruta, 10);
    const hashTech = await bcrypt.hash(senhaTechBruta, 10);
    const hashUser = await bcrypt.hash(senhaUserBruta, 10);

    const usuarios = [];

    usuarios.push({
      nome: 'Administrador TI',
      email: encryptEmail('admin@itapecerica.sp.gov.br'),
      senha: hashAdmin,
      role: 'ADMIN',
      ramal: '2101',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    usuarios.push({
      nome: 'Suporte Técnico',
      email: encryptEmail('suporte@itapecerica.sp.gov.br'),
      senha: hashTech,
      role: 'TECH',
      ramal: '2105',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    usuarios.push({
      nome: 'Servidor Padrão',
      email: encryptEmail('servidor@itapecerica.sp.gov.br'),
      senha: hashUser,
      role: 'USER',
      ramal: '2415',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    for (let i = 1; i <= 6; i++) {
      usuarios.push({
        nome: `Técnico Genérico ${i}`,
        email: encryptEmail(`tecnico${i}@itapecerica.sp.gov.br`),
        senha: hashTech,
        role: 'TECH',
        ramal: `300${i}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    for (let i = 1; i <= 19; i++) {
      usuarios.push({
        nome: `Servidor Genérico ${i}`,
        email: encryptEmail(`usuario${i}@itapecerica.sp.gov.br`),
        senha: hashUser,
        role: 'USER',
        ramal: `40${i < 10 ? '0' + i : i}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await queryInterface.bulkInsert('Users', usuarios, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};