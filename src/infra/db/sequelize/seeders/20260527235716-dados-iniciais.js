"use strict";
const bcrypt = require("bcrypt");
require("dotenv").config(); // Puxa as informações do arquivo .env

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Busca a senha do .env, ou usa '123456' como fallback (plano B)
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "123456";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 2. Insere o Usuário Admin inicial se ele não existir
    await queryInterface.bulkInsert(
      "Users",
      [
        {
          nome: "Administrador TI",
          email: "adm@gmail.com",
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
      { email: "adm@gmail.com" },
      {},
    );
  },
};