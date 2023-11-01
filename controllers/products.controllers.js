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

const getProducts = async (req, res) => {
  const response = await pool.query(
    "SELECT * FROM products ORDER BY id_product ASC"
  );
 
  res.json(response.rows);
};

const postProduct = async (req, res, next) => {
  const { name, cost, stock, supplier, lowest_price, list_price, branch } = req.body;
 
  const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  
  console.log(req.body);
  const response = await pool.query('INSERT INTO products (name, cost, stock, created, supplier, lowest_price, list_price, branch) VALUES($1, $2, $3, $4, $5, $6, $7, $8)', [name, cost, stock, fechaActual.toDate(), supplier, lowest_price, list_price, branch]);
  console.log(response);

  res.send("product created");

   
  console.log(req.body);
  
  res.send(req.body)
  
  
};


module.exports = { getProducts, postProduct };
