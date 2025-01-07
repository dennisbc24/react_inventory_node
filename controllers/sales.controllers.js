const { Pool } = require("pg");
//const { postExistence } = require("./existence.controllers");
const {SalesService} = require('../services/sales_service')
const service = new SalesService()
const moment = require("moment-timezone");
// Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
//moment.tz.setDefault('America/Lima');
// Crea un objeto moment con la hora actual en Lima
//const fechaActual = moment();

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
  const response = await service.get()
  res.json(response);
};

const getSalesByDate = async (req, res) => {
  
  const response = await service.getByDate(req)
  res.json(response);
};

const getSalesByMonth = async (req, res) => {
  const response = await service.getByMonth(req)
  res.json(response)
};

const getSalesMonthy = async (req, res) => {
  const response = await service.salesSumMonthly(req)
  res.json(response)
};
const getByProduct = async (req, res) => {
  const response = await service.getSaleByProduct(req)
  res.json(response)
};

const postSales = async (req, res, next) => {
  // const { branch, date, amount, product, p_total, p_unit, revenue } = req.body;

  // const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  // moment.tz.setDefault("America/Lima");
  // const horaActual = fechaActual.format("HH:mm:ss"); // Formatea la hora
  // console.log(req.body);
  // const response = await pool.query(
  //   "INSERT INTO sales (branch, date, amount, product, p_total, p_unit, revenue, hour) VALUES($1, $2, $3, $4, $5, $6, $7, $8)",
  //   [branch, date, amount, product, p_total, p_unit, revenue, horaActual]
  // );
  // console.log(response);

  // res.send("sale created");
  // console.log(req.body);
  // res.send(req.body);
};

const postVendings = async (req, res, next) => {
  const response = await service.register(req)
  res.send("sale created");
};


const deleteSalesById = async (req, res) => {
  const response = await service.dalete(req)
  res.send(response)
}

const getLastSales = async (req,res)=>{
  const response = await service.getLastSales(req)
  res.json(response)
}

module.exports = {
  getSales,
  getSalesByDate,
  postSales,
  getSalesByMonth,
  postVendings,
  deleteSalesById,getSalesMonthy,getByProduct,
  getLastSales
};
