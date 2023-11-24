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

const getBox = async (req, res) => {
  const response = await pool.query(
    "SELECT * FROM box ORDER BY date DESC LIMIT 15"
  );
 
  res.json(response.rows);
};

const getByMonth = async (req, res) => {
  try {
    const month = req.query.month
    const year = req.query.year
    console.log(month,year);
    const response = await pool.query("SELECT * FROM public.box WHERE	EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 ORDER BY date DESC" , [year,month]);
    res.json(response.rows);
  } catch (error) {
    console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
}
// const getProductsById = async (req, res) => {
// const id = req.params.id
// const response = await pool.query("SELECT * FROM products WHERE id_product = $1", [id] )
// res.json(response.rows);
// };



// const deleteProductsById = async (req, res) => {
//   const id = req.params.id
//   const response = await pool.query("DELETE FROM products WHERE id_product = $1", [id] )
//   console.log(response);
//   res.json(`Product: ${id} deleted successfully`);
//   };
  
const postBox = async (req, res) => {
  const { concept, date ,amount, branch, bill} = req.body;

  console.log(req.body);
  const response = await pool.query('INSERT INTO box (concept, date ,amount, branch, bill) VALUES($1, $2, $3, $4, $5)', [concept, date ,amount, branch, bill]);
  console.log(response);

  res.send("money movement created");
  
  
};

const deleteBoxById = async (req, res) => {
  const id = req.params.id
  const response = await pool.query("DELETE FROM box WHERE id_money_movement = $1", [id] )
  console.log(response);
  res.json(`Product: ${id} deleted successfully`);
  };
  


module.exports = {getBox, postBox, deleteBoxById, getByMonth}