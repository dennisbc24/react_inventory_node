const { checkDb } = require("../config/db");

const DB_DOWN_MSG = "Sin conexión a la base de datos. Intenta de nuevo en unos segundos.";
let lastOk = true;
let lastCheck = 0;

// corta con 503 JSON si la BD no responde, sin tumbar el proceso
async function dbHealth(req, res, next) {
  const now = Date.now();
  // si la última comprobación falló, reusa el resultado por 5s para no saturar
  if (!lastOk && now - lastCheck < 5000) {
    return res.status(503).json({ message: DB_DOWN_MSG });
  }
  const ok = await checkDb(2500);
  lastOk = ok;
  lastCheck = now;
  if (!ok) {
    return res.status(503).json({ message: DB_DOWN_MSG });
  }
  next();
}

module.exports = { dbHealth, DB_DOWN_MSG };
