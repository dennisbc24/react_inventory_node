const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createVentaSchema = require("../../schemas/ventas.schema");
const Venta = require("../../modelMongo/ventas");

const router = express.Router();

const Ventas = require("../../modelMongo/ventas");

router.get("/", async (req, res) => {
  try {
    const arrayProductDB = await Ventas.aggregate([
      {
        $match: {
          Fecha: {
            $gte: new Date(año, mes - 1, 1),
            $lt: new Date(año, mes, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalPt: { $sum: '$pt' }
        }
      }
    ])
    res.json(arrayProductDB);
  } catch (err) {
    console.log(err);
  }
})



.exec((err, result) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Total pt for the month:', result[0].totalPt);
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
