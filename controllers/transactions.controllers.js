const { Pool } = require("pg");
const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
const config = require("../config/config");

const pool = new Pool({
  user: config.config.dbUser,
  host: config.config.dbHost,
  database: config.config.dbName,
  password: config.config.dbPassword,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

const postTransactions = async (req, res) => {
  const {pointA,pointB, amount,fk_user,date,fk_product  } = req.body
try {
  //consultar si hay existencia con pointA y fk_product
  //si hay, modificar y si no hay crear
    //registrar transaction
    console.log(req.body);
    
} catch (e) {
    console.error(e);
}
};




  module.exports ={postTransactions }
