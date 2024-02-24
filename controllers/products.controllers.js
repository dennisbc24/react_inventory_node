const { Pool } = require("pg");

const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
    // Crea un objeto moment con la hora actual en Lima
  const fechaActual = moment();

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

const getProducts = async (req, res) => {
  const response = await pool.query(
    "SELECT * FROM products ORDER BY name ASC"
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
  const { name, cost, supplier, lowest_price, list_price, amount, fk_branch, fk_user } = req.body;
  
  if (supplier=='') {
    const response = await pool.query('INSERT INTO products (name, cost, created, lowest_price, list_price) VALUES($1, $2, $3, $4, $5 ) RETURNING id_product', [name, cost, fechaActual.toDate(), lowest_price, list_price]);
    newProductId = response.rows[0].id_product;
    const response2 = await pool.query('INSERT INTO existence (amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1, $2, $3, $4, $5, $6)', [amount, fk_branch, newProductId, fk_user,fechaActual.toDate(),fechaActual.toDate()]);
  } else {
    const response = await pool.query('INSERT INTO products (name, cost, created, supplier, lowest_price, list_price) VALUES($1, $2, $3, $4, $5, $6 ) RETURNING id_product', [name, cost, fechaActual.toDate(), supplier, lowest_price, list_price]);
    newProductId = response.rows[0].id_product;
    const response2 = await pool.query('INSERT INTO existence (amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1, $2, $3, $4, $5, $6)', [amount, fk_branch, newProductId, fk_user,fechaActual.toDate(),fechaActual.toDate()]);
  }


  console.log("product created");
  console.log(req.body)
  res.send(req.body);
};

const updateProductsById = async (req, res) => {
  const id = req.params.id_product
  const { name, cost, lowest_price, list_price } = req.body;
  console.log(id, name, cost, lowest_price,list_price);
  const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4  WHERE id_product = $5 ", [name, cost, lowest_price, list_price, id] )
  console.log(response);
  res.json(`Product: ${id} updated successfully`);
  };


  const latestUpdates = async(req,res) => {

    //const limit = req.query.limit
    const response = await pool.query("SELECT * FROM public.products ORDER BY id_product DESC LIMIT 7");
    res.json(response.rows);
  }

module.exports = {latestUpdates, updateProductsById, getProducts, postProduct, getProductsById, deleteProductsById };
