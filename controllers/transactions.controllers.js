const { Pool } = require("pg");
const moment = require("moment-timezone");
// Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
moment.tz.setDefault("America/Lima");
const config = require("../config/config");

const pool = new Pool({
  user: config.config.dbUser,
  host: config.config.dbHost,
  database: config.config.dbName,
  password: config.config.dbPassword,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

const postTransactions = async (req, res) => {
  const { pointA, pointB, amount, fk_user, date, fk_product } = req.body;
console.log(req.body);
  try {
    const responseA = await pool.query(
      "SELECT id_existence FROM public.existence WHERE fk_branch= $1 AND fk_product= $2;",
      [pointA, fk_product]
    );
    const existenceA = responseA.rows[0];

    const responseB = await pool.query(
      "SELECT id_existence FROM public.existence WHERE fk_branch= $1 AND fk_product= $2;",
      [pointB, fk_product]
    );
    const existenceB = responseB.rows[0];

    const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima

    if (existenceA == undefined && existenceB == undefined) {
      console.log(existenceA, existenceB);
      console.log("log: no existen puntos de salida ni de llegada");
      res.send("no existen puntos de salida ni de llegada");
    } else if (existenceA == undefined) {
      console.log("no existe punto de salida");
      res.send("no existe punto de salida");
    } else if (existenceB == undefined) {
      console.log("no existe punto de llegada");
      const createExistence = await pool.query(
        "INSERT INTO existence(amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_existence",
        [
          amount,
          pointB,
          fk_product,
          fk_user,
          fechaActual.toDate(),
          fechaActual.toDate(),
        ]
      );
      newExistenceId = createExistence.rows[0].id_existence;
      const createTransaction = await pool.query(
        "INSERT INTO transactions(fk_existence_a, fk_existence_b, amount, fk_user, date, fk_product)VALUES ($1, $2, $3, $4, $5,$6) ",
        [
          existenceA.id_existence,
          newExistenceId,
          amount,
          fk_user,
          date,
          fk_product,
        ]
      );
    } else {
      console.log(existenceA.id_existence, existenceB.id_existence);
      console.log("si existen los 2");
      const incomming = await pool.query(
        "UPDATE existence SET amount = amount - $1, fk_user = $2, updated = $3 WHERE fk_branch = $4 AND fk_product = $5 ;",
        [amount, fk_user, fechaActual.toDate(), pointA, fk_product]
      );
      const outgoing = await pool.query(
        "UPDATE existence SET amount = amount + $1, fk_user = $2, updated = $3 WHERE fk_branch = $4 AND fk_product = $5 ;",
        [amount, fk_user, fechaActual.toDate(), pointB, fk_product]
      );
      const createTransaction = await pool.query(
        "INSERT INTO transactions(fk_existence_a, fk_existence_b, amount, fk_user, date, fk_product)VALUES ($1, $2, $3, $4, $5,$6)",
        [
          existenceA.id_existence,
          existenceB.id_existence,
          amount,
          fk_user,
          date,
          fk_product,
        ]
      );
    }
  } catch (e) {
    console.error(e);
  }
};

const joinTransactions = async (req, res) => {
  const response = await pool.query("SELECT public.transactions.amount AS cantidad,users.name AS usuario,  date, products.name AS producto,br1.name AS origen, br2.name AS destino,  id_transaction   FROM public.transactions  INNER JOIN users ON transactions.fk_user = users.id_user  INNER JOIN products ON transactions.fk_product = products.id_product  INNER JOIN existence ex1 ON transactions.fk_existence_a = ex1.id_existence  INNER JOIN branches br1 ON ex1.fk_branch = br1.id_branch  INNER JOIN existence ex2 ON transactions.fk_existence_b = ex2.id_existence  INNER JOIN branches br2 ON ex2.fk_branch = br2.id_branch  ORDER BY id_transaction DESC LIMIT 15");
 
  res.json(response.rows);
};

module.exports = { postTransactions, joinTransactions };
