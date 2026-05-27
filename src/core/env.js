require('dotenv').config();

module.exports = {
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    dialect: process.env.DB_DIALECT,
  },
  app: {
    port: process.env.PORT || 3333,
    jwtSecret: process.env.JWT_SECRET,
  }
};