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

const getSummaries = async (req, res) => {
    const response = await pool.query(
      "SELECT * FROM summaries ORDER BY id_summary ASC ");
   
    res.json(response.rows);
  };


module.exports = {getSummaries};