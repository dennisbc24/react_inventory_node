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

const postEntries = async (req, res) => {
try {
    //agregar al router
    //buscar con el id de product y brnack si existe el fk_existence
    // agregar la cantidad en el existence
    // y si no existe crear la existencia
    // por ultimo crear el registro entry
    
    
} catch (e) {
    console.error(e);
}
};

module.exports = {postEntries};