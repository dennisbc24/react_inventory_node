const Joi = require("joi");

//const id = Joi.string();
const Sucursal = Joi.string();
const Fecha = Joi.date();
const Cantidad = Joi.number();
const Articulo = Joi.string();
const pt = Joi.number();
const pu = Joi.number();
const utilidad = Joi.number();

const createVentaSchema = Joi.object({
  Sucursal: Sucursal.required(),
  Fecha: Fecha.required(),
  Cantidad: Cantidad.required(),
  Articulo: Articulo.required(),
  pt: pt.required(),
  pu: pu.required(),
  utilidad: utilidad.required(),
});

module.exports = { createVentaSchema };
