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



/* .exec((err, result) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Total pt for the month:', result[0].totalPt);
});
 */
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
