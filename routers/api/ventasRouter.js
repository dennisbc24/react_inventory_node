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

router.post("/", 
//validationSchema(createVentaSchema, 'body'),
async (req, res, next) => {
  try {
    
    //const newSell = Venta.create(body);
    //res.json(req);
    formData = req.body;
    console.log("Datos recibidos:", JSON.stringify(formData));
    res.json(formData)
    
  } catch (e) {
    next(e)
  }
});

module.exports = router;
