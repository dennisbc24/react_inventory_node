const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createVentaSchema = require("../../schemas/ventas.schema");
const Venta = require("../../modelMongo/ventas");

const router = express.Router();

const Ventas = require("../../modelMongo/ventas");

router.get("/", async (req, res) => {
  try {
    const arrayProductDB = await Ventas.find().limit(7);
    res.json(arrayProductDB);
  } catch (err) {
    console.log(err);
  }
});

router.get("/filter", async (req, res) => {
  try {
    
    const filtro = await Ventas.aggregate([
  {
    '$match': {
      'Fecha': {
        '$gte': new Date('2023-06-08'), 
        '$lt': new Date('2023-06-09')
      }
    }
  }, {
    '$group': {
      '_id': '$Sucursal', 
      'suma': {
        '$sum': '$pt'
      },
       
      'ganancia': {
        '$sum': '$utilidad'
      }
    }
  }
])
    res.json(filtro);
  } catch (err) {
    console.log(err);
  }
});

router.post("/", 
//validationSchema(createVentaSchema, 'body'),
async (req, res, next) => {
  try {
    
    //const newSell = Venta.create(body);
    //res.json(req);
    
    console.log("Datos recibidos:", req.body);
    res.json(req.body)
    
  } catch (e) {
    next(e)
  }
});

module.exports = router;
