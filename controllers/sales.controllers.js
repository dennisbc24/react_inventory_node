const { Pool } = require("pg");

const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  //moment.tz.setDefault('America/Lima');
    // Crea un objeto moment con la hora actual en Lima
  //const fechaActual = moment();


const config = require("../config/config");

//const { description } = require("../schemas/ventas.schema");

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

const getSales = async (req, res) => {
  const response = await pool.query(
    "SELECT * FROM sales ORDER BY date DESC, hour DESC LIMIT 5"
  );
  res.json(response.rows);
};

const getSalesByDate = async(req,res) => {

  const date = req.query.date
  const response = await pool.query("SELECT * FROM public.sales WHERE date = $1 ORDER BY hour DESC", [date]);
  res.json(response.rows);
}

const postSales = async (req, res, next) => {
  const { branch, date ,amount, product, p_total, p_unit, revenue } = req.body;
 
  const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  moment.tz.setDefault('America/Lima');
  const horaActual = fechaActual.format('HH:mm:ss'); // Formatea la hora
  console.log(req.body);
  const response = await pool.query('INSERT INTO sales (branch, date, amount, product, p_total, p_unit, revenue, hour) VALUES($1, $2, $3, $4, $5, $6, $7, $8)', [branch, date, amount, product, p_total, p_unit, revenue, horaActual]);
  console.log(response);

  res.send("sale created");
  console.log(req.body);
  res.send(req.body)
};

module.exports = { getSales, getSalesByDate, postSales };
