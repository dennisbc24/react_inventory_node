const { Pool } = require("pg");
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

const getSales = async (req, res) => {
 const response =  await pool.query("SELECT * FROM users ORDER BY id ASC");
 console.log(response.rows);
 res.send('sales')
};

module.exports = { getSales };
