const { Pool } = require("pg");
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

module.exports = { getProducts };
