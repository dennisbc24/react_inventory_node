const express = require("express");
const router = express.Router();
const {uploadFile} = require('../../helpers/aws')

const { latestUpdates, updateProductsById, getProducts, getProductsById ,postProduct, deleteProductsById, saveImage} = require('../../controllers/products.controllers')

router.get("/", getProducts)
router.patch("/:id_product", updateProductsById)
router.get("/", getProductsById)
router.get("/latestProducts", latestUpdates)

router.post("/", postProduct)
router.delete("/:id", deleteProductsById)


router.post("/files",async (req, res) => {
   
  try {
    const imagen = req.files.photo
    //const datos = JSON.parse(req.body.datos)

    const uploadPhoto = await uploadFile(imagen);
    //const arrayProductDB = Product.create(datos)
    //res.json(arrayProductDB);
    console.log(uploadPhoto);
    
    res.json({message: 'archivo subido'})

  }
    catch(e){
      next(e)
  } 
});

module.exports = router;
