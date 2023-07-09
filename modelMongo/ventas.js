const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ventasSchema = new Schema({
  Sucursal: String,
  Fecha: Date,
  Cantidad: Number,
  Articulo: String,
  pt: Number,
  pu: Number,
  utilidad: Number,
  hora: Date,
});

const Ventas = mongoose.model("ventas", ventasSchema);

module.exports = Ventas;
