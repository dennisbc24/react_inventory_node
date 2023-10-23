const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createVentaSchema = require("../../schemas/ventas.schema");
const Venta = require("../../modelMongo/ventas");

const router = express.Router();

const { getSales, postSales } = require("../../controllers/sales.controllers");

router.get("/", getSales);
router.post("/", postSales);

module.exports = router;
