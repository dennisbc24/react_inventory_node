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


  const getSummaryByMonth = async(req,res) => {
    try {
      const month = req.query.month
      const year = req.query.year
      const response = await pool.query("SELECT * FROM public.summaries WHERE EXTRACT(YEAR FROM month_summary) = $1 AND EXTRACT(MONTH FROM month_summary) = $2", [year,month]);
      res.json(response.rows);
    } catch (error) {
      console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
      
      
    }
  const getSummariesByDay = async (req, res) => {
    try {
      const month = req.query.month
    const year = req.query.year
    console.log(month)
    console.log(year)
    ;
    
    const response = await pool.query("SELECT DATE(date) AS dia, SUM(p_total) AS total_ventas, SUM(revenue) AS ganancia       FROM sales  WHERE       EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2  GROUP BY dia  ORDER BY dia;",[year,month]);
    res.json(response.rows);
    } catch (error) {
      console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' }); 
    }
    
  }

module.exports = {getSummaries, getSummaryByMonth, getSummariesByDay};