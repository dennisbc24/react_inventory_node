const { Pool } = require("pg");

const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
    // Crea un objeto moment con la hora actual en Lima
  const fechaActual = moment();


const config = require("../config/config");
const { response } = require("express");

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
    "SELECT * FROM sales ORDER BY id_sale ASC LIMIT 10"
  );
  res.json(response.rows);
};

const postSales = async (req, res) => {
  //const { branch, amount, product, p_total, p_unit, revenue } = req.body;
 
  /* const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  const horaActual = fechaActual.format('HH:mm:ss'); // Formatea la hora
  console.log(req.body);
  const response = await pool.query('INSERT INTO sales (branch, date, amount, product, p_total, p_unit, revenue, hour) VALUES($1, $2, $3, $4, $5, $6, $7, $8)', [branch, fechaActual.toDate(), amount, product, p_total, p_unit, revenue, horaActual]);
  console.log(response); */

const recibo = req.body

  const respuesta = JSON.parse(recibo)
  console.log(respuesta);
  //res.send("sale created");
};

module.exports = { getSales, postSales };
