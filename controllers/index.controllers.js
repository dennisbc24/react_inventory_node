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

const getSales = async (req, res) => {
 const response =  await pool.query("SELECT * FROM sales ORDER BY id_sale ASC LIMIT 10");
 console.log(response.rows);
 res.send('sales')
};

module.exports = { getSales, createSales ,getById, deleteById, updateById};
