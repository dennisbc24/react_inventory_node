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
  async newDebt(req) {
    try {
      const {debt, expiration_date, description, currency, fk_user} = req.body      
      const createDebt = await pool.query('INSERT INTO public.debts(	debt, expiration_date, description, currency, fk_user)	VALUES ($1, $2, $3, $4, $5);', [debt, expiration_date, description, currency, fk_user])
      return 'new debt created sucessfully'
    } catch (error) {
      console.error(error);
      
    }
  }
  async getTransactionByUser(req)  {
 try {
  
        
  const  user  = req.query.user;
  const date = req.query.date;


  const year = date.substring(0,4)
  const month = date.substring(5,7)
 
  const response = await pool.query("select id_money_movement, concept, date, amount, bill as gasto, users.name as Vendedor from box inner join users  on box.fk_user = users.id_user WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 and box.fk_user = $3 order by date DESC limit 30;",[ year,month, user])
  console.log(response);
  
  return response.rows
 } catch (error) {
  console.error(error);
  
 }
  }  

  async getLastSpends(req) {
    try {  
      const  user  = req.query.user;
         
      const response = await pool.query("select concept, date, amount from box inner join users  on box.fk_user = users.id_user where fk_user = $1 order by date DESC limit 15;;",[user])
      console.log(response);
      
      return response.rows
     } catch (error) {
      console.error(error);
      
     }
  }
}

  
module.exports = {Box}