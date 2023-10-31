const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createProductSchema = require("../../schemas/products.schema");
const router = express.Router();


const { updateProductsById, getProducts, getProductsById ,postProduct, deleteProductsById} = require('../../controllers/products.controllers')

router.get("/", getProducts)
router.get("/:id", getProductsById)
router.post("/", postProduct)
router.delete("/:id", deleteProductsById)
router.put("/:id", updateProductsById)




module.exports = router;
