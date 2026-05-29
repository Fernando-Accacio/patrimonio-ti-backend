"use strict";
const bcrypt = require("bcrypt");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Gera a senha criptografada para o Admin padrão
    const hashedPassword = await bcrypt.hash("senha-super-segura", 10);

    // 2. Insere o Usuário Admin inicial se ele não existir
    await queryInterface.bulkInsert(
      "Users",
      [
        {
          nome: "Administrador TI",
          email: "admin@prefeitura.sp.gov.br",
          senha: hashedPassword,
          role: "ADMIN",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    // Comando para limpar os dados caso queira reverter o seeder
    await queryInterface.bulkDelete(
      "Users",
      { email: "admin@prefeitura.sp.gov.br" },
      {},
    );
  },
};
