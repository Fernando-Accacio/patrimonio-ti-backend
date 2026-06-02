"use strict";
const bcrypt = require("bcrypt");
const crypto = require("crypto"); // NOVO: Importa o módulo de criptografia
require("dotenv").config();

// --- MESMA CONFIGURAÇÃO DO REPOSITÓRIO/SERVICE ---
const ALGORITHM = 'aes-256-cbc';
const CRYPTO_SECRET = process.env.CRYPTO_SECRET || '12345678901234567890123456789012'; 

const encryptEmail = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(CRYPTO_SECRET), iv);
  let encrypted = cipher.update(text.toLowerCase());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "123456";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 1. Criptografa o e-mail do Admin antes de salvar no banco
    const encryptedEmail = encryptEmail("adm@gmail.com");

    // 2. Insere o Usuário Admin com o e-mail mascarado de forma segura
    await queryInterface.bulkInsert(
      "Users",
      [
        {
          nome: "Administrador TI",
          email: encryptedEmail, // <--- E-mail encriptado aqui
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
    // ATENÇÃO: Como o IV gera um hash aleatório toda vez, não podemos buscar pelo e-mail no delete.
    // Buscaremos pelo Nome e Role para limpar o seeder com segurança.
    await queryInterface.bulkDelete(
      "Users",
      { nome: "Administrador TI", role: "ADMIN" },
      {},
    );
  },
};