const { Pool } = require("pg");
const { config } = require("./config");

const ssl = config.dbHost === "127.0.0.1" || config.dbHost === "localhost"
  ? false
  : { rejectUnauthorized: false };

const baseConfig = {
  user: config.dbUser,
  host: config.dbHost,
  database: config.dbName,
  password: config.dbPassword,
  port: config.dbPort,
  // SSM tunel local (127.0.0.1:5433) no necesita ssl; prod EC2 sí
  ssl,
};

const pool = new Pool(baseConfig);

// Pool separado para forecasting: consultas pesadas con límites propios para
// no competir con el resto de la aplicación por conexiones/CPU de Postgres.
const forecastingPool = new Pool({
  ...baseConfig,
  max: Number(process.env.FORECASTING_DB_POOL_MAX || 2),
  idleTimeoutMillis: Number(process.env.FORECASTING_DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.FORECASTING_DB_CONNECT_TIMEOUT_MS || 10000),
  statement_timeout: Number(process.env.FORECASTING_DB_STATEMENT_TIMEOUT_MS || 120000),
  application_name: "inventario-forecasting",
  // Garantiza que este pool nunca escriba: cualquier INSERT/UPDATE/DELETE falla.
  options: "-c default_transaction_read_only=on",
});

// un cliente idle que pierde la conexión no debe tumbar el proceso
pool.on("error", (err) => {
  console.error("DB pool error (cliente inactivo):", err.message);
});

forecastingPool.on("error", (err) => {
  console.error("DB forecasting pool error (cliente inactivo):", err.message);
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

module.exports = { pool, forecastingPool, checkDb };
