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
 const response =  await pool.query("SELECT * FROM users ORDER BY id ASC");
 res.status(200).json(response.rows)
};

const getById = async (req, res) => {
  const id = req.params.id
  const response= await pool.query('SELECT * FROM users  WHERE id = $1', [id])
  res.json((response).rows)
 };

const createSales = async (req, res) => {
 const {name, count, description} = req.body;
const response = await pool.query("INSERT INTO users (name, count, description) VALUES ($1, $2, $3)", [name, count, description])
  console.log(response);
res.json({
  message: 'sell created successfully',
body: {
  venta:{name, count, description}
}
})
 };

 const deleteById = async (req, res) => {
  const id = req.params.id
  const response = await pool.query('DELETE FROM users WHERE id = $1', [id])
  res.json({
    message: `deleted id ${id} successfully`
  })
 };

 const updateById =  async (req, res) => {
  const id = req.params.id
  const {name, count, description} = req.body;
  const response = await pool.query('UPDATE users SET name = $1, count = $2, description = $3 WHERE id = $4 ', [name, count, description, id])
  console.log(response);
  res.json('Sell Updated Successfully')
 };


module.exports = { getSales, createSales ,getById, deleteById, updateById};
