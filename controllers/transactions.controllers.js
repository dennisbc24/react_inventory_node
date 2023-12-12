const { Pool } = require("pg");
const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
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
  const {pointA,pointB, amount,fk_user,date,fk_product  } = req.body
  

try {
  const responseA = await pool.query("SELECT EXISTS (SELECT 1 FROM public.existence WHERE fk_branch= $1 AND fk_product= $2);",[pointA,fk_product]);
  const existenceA = responseA.rows[0].exists;
  const responseB = await pool.query("SELECT EXISTS (SELECT 1 FROM public.existence WHERE fk_branch= $1 AND fk_product= $2);",[pointB,fk_product]);
  const existenceB = responseB.rows[0].exists;

  const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima

  if (existenceA == true && existenceB == true) {

    
    const incomming = await pool.query('UPDATE existence SET amount = amount - $1, fk_user = $2, updated = $3 WHERE fk_branch = $4 AND fk_product = $5 ;', [amount, fk_user, fechaActual.toDate(), pointA, fk_product]);
    const outgoing = await pool.query('UPDATE existence SET amount = amount + $1, fk_user = $2, updated = $3 WHERE fk_branch = $4 AND fk_product = $5 ;', [amount, fk_user, fechaActual.toDate(), pointB, fk_product]);
    const createTransaction = await pool.query('INSERT INTO transactions(fk_existence_a, fk_existence_b, amount, fk_user, date, fk_product)VALUES ($1, $2, $3, $4, $5,$6)', [pointA, pointB,amount,fk_user, date, fk_product]);

    console.log('si existen');
  } else {
    console.log('no existe');
  }


    
} catch (e) {
    console.error(e);
}
};




  module.exports ={postTransactions }
