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

const postExistence = async (req, res) => {
try {
    const { amount, fk_branch, fk_product, fk_user } = req.body;
    const response = await pool.query('INSERT INTO existence (amount, fk_branch, fk_product, fk_user) VALUES ($1, $2, $3, $4)', [amount, fk_branch, fk_product, fk_user]);
      
    res.send("existence registered");
    
    
} catch (e) {
    console.error(e);
}


    
  };

  module.exports ={postExistence}