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

const getSupliers = async (req, res) => {
  const response = await pool.query("SELECT * FROM suppliers ORDER BY name ASC");
 
  res.json(response.rows);
};

module.exports = {getSupliers}