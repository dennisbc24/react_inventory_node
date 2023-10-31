const { Pool } = require("pg");
const config = require("../config/config");
const { response } = require("express");
//const { description } = require("../schemas/ventas.schema");

const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
    // Crea un objeto moment con la hora actual en Lima
  const fechaActual = moment();


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

const getProductsById = async (req, res) => {
const id = req.params.id
const response = await pool.query("SELECT * FROM products WHERE id_product = $1", [id] )
res.json(response.rows);
};

const deleteProductsById = async (req, res) => {
  const id = req.params.id
  const response = await pool.query("DELETE FROM products WHERE id_product = $1", [id] )
  console.log(response);
  res.json(`Product: ${id} deleted successfully`);
  };
  


const postProduct = async (req, res) => {
  const { name, cost, supplier, lowest_price, list_price } = req.body;
 
  const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  
  console.log(req.body);
  const response = await pool.query('INSERT INTO products (name, cost, stock, created, supplier, lowest_price, list_price) VALUES($1, $2, $3, $4, $5, $6, $7 )', [name, cost, 0, fechaActual.toDate(), supplier, lowest_price, list_price]);
  console.log(response);

  res.send("product created");

   
  console.log(req.body);
  
  res.send(req.body)
};

const updateProductsById = async (req, res) => {
  const id = req.params.id
  const { cost, lowest_price, list_price } = req.body;
  const response = await pool.query("UPDATE products SET cost = $1, lowest_price = $2, list_price = $3  WHERE id_product = $4 ", [cost, lowest_price, list_price, id] )
  console.log(response);
  res.json(`Product: ${id} updated successfully`);
  };


module.exports = {updateProductsById, getProducts, postProduct, getProductsById, deleteProductsById };
