const express = require("express");
const router = express.Router();

const Ventas = require('../../modelMongo/ventas');

router.get('/', async(req, res) => {
    try {
      const arrayProductDB = await Ventas.find().limit(7)
      res.json(arrayProductDB)
    } catch (err) {
      console.log(err);
    }
  })

module.exports = router;
