const express = require("express");
const router = express.Router();


const { latestUpdates, updateProductsById, getProducts, getProductsById ,postProduct, deleteProductsById, saveImage} = require('../../controllers/products.controllers')

router.get("/", getProducts)
router.patch("/:id_product", updateProductsById)
router.get("/", getProductsById)
router.get("/latestProducts", latestUpdates)

router.post("/", postProduct)
router.delete("/:id", deleteProductsById)
router.post("/files",saveImage )

module.exports = router;
