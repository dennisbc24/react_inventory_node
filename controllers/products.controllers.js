const { pool } = require("../config/db");
const moment = require('moment-timezone');

  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
    // Crea un objeto moment con la hora actual en Lima
  const fechaActual = moment();
  const {ProductsService} = require('../services/products_service')
  const {uploadFile} = require("../helpers/aws")
const service = new ProductsService()
const { response } = require("express");

const getProducts = async (req, res, next) => {
  try {
    const response = await pool.query(
      "SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category ORDER BY p.name ASC"
    );
    res.json(response.rows);
  } catch(e){ next(e); }
};

const getProductsById = async (req, res, next) => {
    try {
      const response = await service.getById(req)
      res.json(response);
    } catch(e){ next(e); }
};

const deleteProductsById = async (req, res, next) => {
  try {
    const response = await service.delete(req)
    res.json(response);
  } catch(e){ next(e); }
  };
  
const postProduct = async (req, res, next) => {
  try {
    const response = await service.create(req)
    // service.create ahora lanza error con status si fk_category inválida
    if (response instanceof Error) throw response;
    res.send(response);
  } catch(e){ next(e); }
};

const updateProductsById = async (req, res, next) => {
  try {
    const id = req.params.id
    console.log(id);
    const response = await service.update(req)
    res.json(response);
  } catch(e){ next(e); }
  };
  
  const latestUpdates = async(req,res) => {
    const response = await service.getLatestUpdates()
    res.json(response);
  }

module.exports = {latestUpdates, updateProductsById, getProducts, postProduct, getProductsById, deleteProductsById };
