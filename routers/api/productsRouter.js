const express = require("express");
const validationSchema = require("../../middlewares/validation.handler");
const createProductSchema = require("../../schemas/products.schema");
const router = express.Router();

const Products = require("../../modelMongo/products");

router.get("/", async (req, res) => {
  try {
    const arrayProductDB = await Products.find().limit(7);
    res.json(arrayProductDB);
  } catch (err) {
    console.log(err);
  }
});

router.post(
  "/",
  validationSchema(createProductSchema, "body"),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newProduct = Products.create(body);
      res.json(body);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
