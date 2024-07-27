const { Pool } = require("pg");
const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
    // Crea un objeto moment con la hora actual en Lima
  const fechaActual = moment();
  const {ProductsService} = require('../services/products_service')
const service = new ProductsService()
const config = require("../config/config");
const { response } = require("express");

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
    const response = await service.getById(req)
    res.json(response);
};

const deleteProductsById = async (req, res) => {
  const response = await service.delete(req)
  res.json(response);
  };
  
const postProduct = async (req, res) => {
  const response = await service.create(req)
  res.send(response);
};

const updateProductsById = async (req, res) => {
  const response = await service.update(req)
  res.json(response);  
  };


  const latestUpdates = async(req,res) => {
    const response = await service.getLatestUpdates()
    res.json(response);
  }

  const saveImage = async(req, res)=> {
    const response = await service.uploadImageService(req)
    res.json(response)
  }

module.exports = {latestUpdates, updateProductsById, getProducts, postProduct, getProductsById, deleteProductsById, saveImage };
