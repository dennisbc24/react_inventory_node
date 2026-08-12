const { pool } = require("../config/db");

const getSupliers = async (req, res) => {
  const response = await pool.query("SELECT * FROM suppliers ORDER BY name ASC");
 
  res.json(response.rows);
};

module.exports = {getSupliers}