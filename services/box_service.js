const { pool } = require("../config/db");

class Box {
    constructor(){}
    async getByUser(req){
        try {
        
            const  user  = req.query.id;
            console.log(user);
            const response = await pool.query("select sum(p_total) as caja_total from public.sales where date >= '12-01-2024'  and fk_id_user = $1;",[user])
            const response2 = await pool.query("select sum(amount) as gasto_total from box where date >='12-01-2024' and fk_user= $1;", [user])
          
          let venta = 0
          let gasto = 0
          if (response.rows[0].caja_total !== null) {
            venta = parseFloat(response.rows[0].caja_total)
          }
          if (response2.rows[0].gasto_total !== null) {
            gasto = parseFloat(response2.rows[0].gasto_total)
          }
          console.log(venta, gasto);
          
            return venta + gasto
        } catch (error) {
            console.log(error);
        }
       
    }
    
  async getDebts(){
    try {
      const debts = await pool.query('SELECT * FROM public.debts where  paid = false ORDER BY expiration_date ASC ')
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

  async payDebt(req) {
    try {
      console.log(req.body);
      
      const {idDebt, total, concept, user} = req.body

      const negativeAmount = -total
      const payADebt = await pool.query('UPDATE public.debts SET  paid = true	WHERE id_debts = $1;', [idDebt])
      const updateCash = await pool.query("UPDATE public.users 	SET cash = cash - $1 WHERE id_user = $2;", [total, user])
      const registerSpend = await pool.query("INSERT INTO public.box(	concept, amount, fk_user) 	VALUES ($1, $2, $3);", [concept, negativeAmount, user])
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
  
  async getGastosByUserRange(req) {
    try {
      const { user, from, to } = req.query;
      const response = await pool.query(
        "SELECT TO_CHAR(date, 'DD/MM/YYYY') AS fecha, concept AS descripcion, amount AS gasto FROM box WHERE fk_user = $1 AND date >= $2::date AND date < ($3::date + 1) AND concept NOT ILIKE 'TRD%' AND concept NOT ILIKE 'ENTREGA%' AND concept NOT ILIKE 'DEVOLUCION%' AND concept NOT ILIKE 'CAMBIO%' AND concept NOT ILIKE 'AJUSTE%' AND concept NOT ILIKE 'ELIMINACION%' ORDER BY date ASC",
        [user, from, to]
      );
      return response.rows;
    } catch (error) {
      console.error(error);
    }
  }

  async adjustCash(req) {
    try {
      const { user, newCash } = req.body;
      const current = await pool.query("SELECT cash FROM users WHERE id_user = $1", [user]);
      const oldCash = parseFloat(current.rows[0]?.cash || 0);
      const diff = parseFloat(newCash) - oldCash;
      await pool.query("INSERT INTO public.box(concept, amount, fk_user) VALUES ($1, $2, $3);", ["AJUSTE DE CAJA", diff, user]);
      await pool.query("UPDATE public.users SET cash = $1 WHERE id_user = $2;", [newCash, user]);
      return "cash ajustado correctamente";
    } catch (error) {
      console.error(error);
    }
  }

  async postMoneyTransaction (req){
    const {concept, amount, userA, userB} = req.body
    console.log(concept, amount, userA, userB);
     const negativeAmount = -amount
   try {
    const response1 = await pool.query("INSERT INTO public.box(	concept, amount, fk_user) 	VALUES ($1, $2, $3);", [concept, negativeAmount, userA])
    const response2 = await pool.query("INSERT INTO public.box(	concept, amount, fk_user) 	VALUES ($1, $2, $3);", [concept, amount, userB])
    const response3 = await pool.query("UPDATE public.users 	SET cash = cash + $1 WHERE id_user = $2;", [amount, userB])
    const response4 = await pool.query("UPDATE public.users SET cash=cash- $1 WHERE id_user=$2;", [amount, userA])

     //INSERT INTO public.box(	concept, amount, fk_user) 	VALUES ('TRD venta domingo miguel', -100, 3); INSERT INTO public.box(	concept, amount, fk_user) 	VALUES ('TRD venta domingo miguel', 100, 1); UPDATE public.users 	SET cash=cash+100 WHERE id_user=1; UPDATE public.users SET cash=cash-100 WHERE id_user=3; 
       return "transaction money registered sucessfully"
   } catch (error) {
    console.error(error);
    
   } 


}}

  
module.exports = {Box}