const express = require("express");
const router = express.Router();

const Products = require('../../modelMongo/products');

router.get('/', async(req, res) => {
    try {
      const arrayProductDB = await Products.find().limit(7)
      res.json(arrayProductDB)
    } catch (err) {
      console.log(err);
    }
  })

module.exports = router;