const {SalesService} = require('../services/sales_service')
const service = new SalesService()
const moment = require("moment-timezone");
// Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
//moment.tz.setDefault('America/Lima');
// Crea un objeto moment con la hora actual en Lima
//const fechaActual = moment();

const { response } = require("express");

//const { description } = require("../schemas/ventas.schema");

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

const getSalesByUserRange = async (req, res) => {
  const response = await service.getByUserRange(req)
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

const getSaleById = async (req, res) => {
  const response = await service.getById(req)
  if (!response) return res.status(404).json({ message: "Venta no existe" });
  res.json(response)
};

const postDevolucion = async (req, res) => {
  try {
    const response = await service.devolucion(req)
    res.json(response)
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ message: e.message || "Error al registrar devolución" });
  }
};

const postCambio = async (req, res) => {
  try {
    const response = await service.cambio(req)
    res.json(response)
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ message: e.message || "Error al registrar cambio" });
  }
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

const getSumSalesToday = async (req,res)=>{
  const response = await service.getSumSalesToday(req)
  res.json(response)
}
const getSumRevenueToday = async (req,res)=>{
  const response = await service.getSumRevenueToday(req)
  res.json(response)
}
const getTopSellingProducts = async (req,res)=>{
  const response = await service.getTopSellingProducts(req)
  res.json(response)  
}
const getBestProducts = async (req,res)=>{
  const response = await service.getBestProducts(req)
  res.json(response)  
}

module.exports = {
  getBestProducts,
  getTopSellingProducts,
  getSales,
  getSalesByDate,
  getSalesByUserRange,  postSales,
  getSalesByMonth,
  postVendings,
  deleteSalesById,getSalesMonthy,getByProduct,
  getSaleById,
  postDevolucion,
  postCambio,
  getLastSales,
  getSumSalesToday,
  getSumRevenueToday
};
