'use strict';
const bcrypt = require('bcrypt');
require('dotenv').config();
const { encryptEmail } = require('../../../../core/utils/auth.utils');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 🌟 Puxando as senhas individuais do .env com backups de segurança caso estejam vazias
    const senhaAdminBruta = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
    const senhaTechBruta = process.env.TECH_DEFAULT_PASSWORD || '123456';
    const senhaUserBruta = process.env.USER_DEFAULT_PASSWORD || '123456';

    // Gerando os hashes específicos para cada nível de acesso
    const hashAdmin = await bcrypt.hash(senhaAdminBruta, 10);
    const hashTech = await bcrypt.hash(senhaTechBruta, 10);
    const hashUser = await bcrypt.hash(senhaUserBruta, 10);

    const usuarios = [];

    // --- 1. OS 3 USUÁRIOS PRINCIPAIS DE TESTES ---
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

    // --- 2. ENCHENDO LINGUIÇA: +6 Técnicos (Usando a senha de técnico) ---
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

    // --- 3. ENCHENDO LINGUIÇA: +19 Usuários Comuns (Usando a senha de usuário) ---
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

    // Inserir todos no banco de dados
    await queryInterface.bulkInsert('Users', usuarios, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};