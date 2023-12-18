const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createVentaSchema = require("../../schemas/ventas.schema");
const Venta = require("../../modelMongo/ventas");

const router = express.Router();

const { getSales, postSales , getSalesByDate, getSalesByMonth, postVendings, deleteSalesById} = require("../../controllers/sales.controllers");

router.get("/", getSales);
router.get("/salesByDate", getSalesByDate);
router.get("/salesByMonth", getSalesByMonth);
router.post("/", postSales);
router.post("/vendings", postVendings)
router.delete("/", deleteSalesById)

module.exports = router;
