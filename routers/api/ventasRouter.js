const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createVentaSchema = require("../../schemas/ventas.schema");
const Venta = require("../../modelMongo/ventas");

const router = express.Router();


const { getSales, createSales, getById, deleteById, updateById } = require('../../controllers/index.controllers')

router.get("/", getSales)

router.get("/:id", getById)

router.post("/", createSales)
router.delete("/:id", deleteById)
router.put("/:id", updateById)


router.get("/filter", async (req, res) => {
  try {
    const desde = req.query.desde
    const hasta = req.query.hasta
    
    const filtro = await Ventas.aggregate([
  {
    '$match': {
      'Fecha': {
        '$gte': new Date(desde), 
        '$lt': new Date(hasta)
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


module.exports = router;
