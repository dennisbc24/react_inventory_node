const { Pool } = require("pg");
const { config } = require("./config");

const pool = new Pool({
  user: config.dbUser,
  host: config.dbHost,
  database: config.dbName,
  password: config.dbPassword,
  port: config.dbPort,
  // SSM tunel local (127.0.0.1:5433) no necesita ssl; prod EC2 sí
  ssl: config.dbHost === "127.0.0.1" || config.dbHost === "localhost" ? false : {
    rejectUnauthorized: false,
  },
});

module.exports = { pool };