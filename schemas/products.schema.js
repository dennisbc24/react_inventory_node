const Joi = require('joi');

//const id = Joi.string();
const name = Joi.string();
const costo = Joi.number();
const stock = Joi.number();
const creacion = Joi.date();


const createProductSchema = Joi.object({
    name: name.required(),
    costo: costo.required(),
    stock: stock.required(),
    creacion: creacion.required()

});

module.exports = createProductSchema;