const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productsSchema = new Schema({
  name: String,
  costo: Number,
  stock: Number,
  creacion: Date,
});

const Products = mongoose.model("products", productsSchema);

module.exports = Products;