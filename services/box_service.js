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

class Box {
    constructor(){}
    async getByUser(req){
        try {
        
            const  user  = req.query.id;
            console.log(user);
            const response = await pool.query("select sum(p_total) as caja_total from public.sales where date >= '12-01-2024'  and fk_id_user = $1;",[user])
            const response2 = await pool.query("select sum(amount) as gasto_total from box where date >='12-01-2024' and fk_user= $1;", [user])
          
          let venta
          let gasto
          if (response.rows[0].caja_total===null) {
            gasto = 0
          }else{
            gasto=parseFloat(response.rows[0].caja_total)
          }
          if (response2.rows[0].gasto_total ===null) {
            venta = 0
          }else{
            venta = parseFloat(response2.rows[0].gasto_total)
          }
          console.log(gasto, venta);
          
            return venta + gasto
        } catch (error) {
            console.log(error);
        }
       
    }
    
  async getDebts(){
    try {
      const debts = await pool.query('SELECT * FROM public.debts ORDER BY expiration_date ASC ')
      return debts.rows
    } catch (e) {
      console.error(e);
      
    }
  }
    
}
    
module.exports = {Box}