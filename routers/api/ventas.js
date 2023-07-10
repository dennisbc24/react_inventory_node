const express = require("express");
const schemaHandler = require("../../middlewares/schema.handler");
const { createProductSchema } = require("../../schemas/ventas.schema");
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

router.post("/", async (req, res) => {
  try {
    const datos = req.body;
    const arrayProductDB = Venta.create(datos);
    res.json(datos);
  } catch (error) {
    console.log(err);
  }
});

module.exports = router;
