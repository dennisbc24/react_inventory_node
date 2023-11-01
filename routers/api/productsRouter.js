const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createProductSchema = require("../../schemas/products.schema");
const router = express.Router();


const { updateProductsById, getProducts, getProductsById ,postProduct, deleteProductsById} = require('../../controllers/products.controllers')

router.get("/", getProducts)



module.exports = router;
