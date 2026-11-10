const { pool } = require("../config/db");

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

const getSalesRange = async (req, res) => {
  try {
    const range = req.query.range;

    let query;
    if (range === "30d") {
      query = `WITH days AS (
        SELECT generate_series(
          (CURRENT_DATE - INTERVAL '29 days')::date,
          CURRENT_DATE,
          '1 day'
        )::date AS period
      )
      SELECT TO_CHAR(d.period, 'YYYY-MM-DD') AS date,
             TO_CHAR(d.period, 'DD/MM') AS label,
             COALESCE(SUM(s.p_total), 0) AS ventas,
             COALESCE(SUM(s.revenue), 0) AS ganancia
      FROM days d
      LEFT JOIN sales s ON s.date = d.period
      GROUP BY d.period
      ORDER BY d.period`;
    } else if (range === "1y") {
      query = `WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
          date_trunc('month', CURRENT_DATE),
          '1 month'
        )::date AS period
      )
      SELECT TO_CHAR(m.period, 'YYYY-MM') AS date,
             TO_CHAR(m.period, 'MM/YYYY') AS label,
             COALESCE(SUM(s.p_total), 0) AS ventas,
             COALESCE(SUM(s.revenue), 0) AS ganancia
      FROM months m
      LEFT JOIN sales s ON s.date >= m.period AND s.date < (m.period + INTERVAL '1 month')
      GROUP BY m.period
      ORDER BY m.period`;
    } else if (range === "4y") {
      query = `WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '47 months',
          date_trunc('month', CURRENT_DATE),
          '1 month'
        )::date AS period
      )
      SELECT TO_CHAR(m.period, 'YYYY-MM') AS date,
             TO_CHAR(m.period, 'MM/YYYY') AS label,
             COALESCE(SUM(s.p_total), 0) AS ventas,
             COALESCE(SUM(s.revenue), 0) AS ganancia
      FROM months m
      LEFT JOIN sales s ON s.date >= m.period AND s.date < (m.period + INTERVAL '1 month')
      GROUP BY m.period
      ORDER BY m.period`;
    } else {
      return res.status(400).json({ message: "Rango inválido. Usa 30d, 1y o 4y" });
    }

    const response = await pool.query(query);
    res.json(response.rows);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {getSummaries, getSummaryByMonth, getSummariesByDay, getSalesRange};