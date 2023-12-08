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

const postExistence = async (req, res) => {
try {
    const { amount, fk_branch, fk_product, fk_user } = req.body;
    const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
    const response = await pool.query('INSERT INTO existence (amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1, $2, $3, $4, $5, $6)', [amount, fk_branch, fk_product, fk_user,fechaActual.toDate(),fechaActual.toDate()]);
      
    res.send("existence registered");
    
    
} catch (e) {
    console.error(e);
}


    
  };

  module.exports ={postExistence}