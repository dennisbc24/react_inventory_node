const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')
//const {uploadFile} = require('../../helpers/aws')

const { latestUpdates, updateProductsById, getProducts, getProductsById ,postProduct, deleteProductsById, saveImage} = require('../../controllers/products.controllers')

router.get("/", getProducts)
router.get("/latestProducts", latestUpdates)
router.get("/:id", getProductsById)
router.patch("/:id", checkRole(['admin']), updateProductsById)

router.post("/", checkRole(['admin']), postProduct)
router.delete("/:id", checkRole(['admin']), deleteProductsById)


router.post("/files", checkRole(['admin']), async (req, res, next) => {
  console.log('formData por recibir');
  console.log(req.body);
  console.log(req.files.photo);
    try {
    const imagen = req.files.photo    
    res.json({message: 'archivo subido'})

  }
    catch(e){
      next(e)
  } 
});

module.exports = router;
