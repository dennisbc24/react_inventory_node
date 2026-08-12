const { pool } = require("../config/db");

const getBranches = async (req, res) => {
  const response = await pool.query("SELECT * FROM public.branches ORDER BY name ASC");
 
  res.json(response.rows);
};

module.exports = {getBranches}