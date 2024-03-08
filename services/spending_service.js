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

class SpendingService {
    constructor(){}
    async get(){
        try {
            const response = await pool.query(
                "SELECT * FROM box ORDER BY date DESC LIMIT 15"
              )
            return response.rows
        } catch (error) {
            console.log(error);
        }
       
    }
    async getByMonth(req){
        try {
            const month = req.query.month
            const year = req.query.year
            console.log(month,year);
            const response = await pool.query("SELECT * FROM public.box WHERE	EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 ORDER BY date DESC" , [year,month]);
            return response.rows
          } catch (error) {
            console.error('Error executing query:', error);
              res.status(500).json({ error: 'Internal Server Error' });
          }
    }
    async post(req){
        try {
            const { concept, date ,amount, branch, bill} = req.body;
  
    console.log(req.body);
    const response = await pool.query('INSERT INTO box (concept, date ,amount, branch, bill) VALUES($1, $2, $3, $4, $5)', [concept, date ,amount, branch, bill]);
    return 'money movement created'
  
    
        } catch (error) {
            console.log(error);
        }
    }
    async delete(req){
        try {
            const id = req.params.id
            const response = await pool.query("DELETE FROM box WHERE id_money_movement = $1", [id] )
            console.log(`Spending: ${id} deleted successfully`);
            return `Spending: ${id} deleted successfully`
        } catch (error) {
            console.log(error);
        }
    }
}
    
module.exports = {SpendingService}