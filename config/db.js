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

// un cliente idle que pierde la conexión no debe tumbar el proceso
pool.on("error", (err) => {
  console.error("DB pool error (cliente inactivo):", err.message);
});

// chequea conexión real con timeout; nunca lanza
async function checkDb(timeoutMs = 2500) {
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("db timeout")), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
}

module.exports = { pool, checkDb };