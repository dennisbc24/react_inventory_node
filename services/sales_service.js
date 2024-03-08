const { Pool } = require("pg");
const bcrypt = require('bcrypt')
const moment = require("moment-timezone");
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

class SalesService{
    constructor(){}
    async get(){
        const response = await pool.query(
            "SELECT * FROM sales ORDER BY date DESC, hour DESC LIMIT 5"
          );
          return response.rows
    }
    async getByDate(req){
        const date = req.query.date;
        const response = await pool.query("SELECT id_sale AS id,users.name AS Vendedor, amount AS Cant, product AS Producto, p_total, p_unit, revenue AS Ganancia, hour AS Hora, customer AS Cliente FROM public.sales     INNER JOIN users ON sales.fk_id_user = users.id_user    WHERE date = $1     ORDER BY hour DESC",    [date]  );
        return response.rows
    }
    async getByMonth(req){
        try {
            const month = req.query.month;
            const year = req.query.year;
            console.log(month, year);
            const response = await pool.query(
              "SELECT EXTRACT(MONTH FROM date) AS mes,SUM(revenue) AS suma_revenue, users.name AS usuario FROM public.sales INNER JOIN public.branches ON sales.fk_id_branch = branches.id_branch INNER JOIN public.users ON sales.fk_id_user = users.id_user WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 GROUP BY  EXTRACT(MONTH FROM date),  usuario ORDER BY  mes,  usuario",
              [year, month]
            );
            return response.rows
          } catch (error) {
            console.error("Error executing query:", error);
            res.status(500).json({ error: "Internal Server Error" });
          }
    }
    async register(req){

    const {date,amount,p_total,p_unit,revenue,customer,fk_id_product,fk_id_user,fk_id_branch,product,branch} = req.body;
    
      // Crea un objeto moment con la hora actual en Lima
    
      const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
      moment.tz.setDefault("America/Lima");
      const horaActual = fechaActual.format("HH:mm:ss"); // Formatea la hora
    
      if (customer == "") {
        const response = await pool.query(
          "INSERT INTO sales (date, amount, p_unit, p_total,revenue,hour,fk_product, fk_id_user, fk_id_branch, product, branch) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
          [date,amount,p_unit,p_total,revenue,horaActual,fk_id_product,fk_id_user,fk_id_branch,product,branch]
        );
        
      } else {
        const response = await pool.query(
          "INSERT INTO sales (date, amount, p_unit, p_total,revenue,hour,customer, fk_product, fk_id_user, fk_id_branch, product, branch) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12)",
          [ date,amount,p_unit,p_total,revenue,horaActual,customer,fk_id_product,fk_id_user,fk_id_branch,product,branch]);
          
      }
    
      console.log(req.body);
      return "sale created"
    }
    async dalete(req){
        const id = req.query.id
  
        const ask = await pool.query("SELECT EXISTS (SELECT 1 FROM public.sales WHERE id_sale = $1)", [id]);
        console.log(ask);
      
      if (ask.rows[0].exists==true) {
        const response = await pool.query("SELECT * FROM sales WHERE id_sale=$1", [id] )
        console.log(response.rows);
        const amount = response.rows[0].amount
        const product = response.rows[0].fk_product
        const branch = response.rows[0].fk_id_branch
      
        const responseUpdateExistence = await pool.query("UPDATE existence SET amount = amount + $1 WHERE fk_branch = $2 AND fk_product = $3 ;",[amount, branch, product]);
      
       const deleteSale = await pool.query("DELETE FROM sales WHERE id_sale=$1", [id] )
        
       return `Product: ${id} deleted successfully`
       
      } else {
        return `Product: ${id} no existe`
      }
      
      
    }
    async sales(){}

}

module.exports = {SalesService}


  

 
  