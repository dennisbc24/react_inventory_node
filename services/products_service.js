const { Pool } = require("pg");
const config = require("../config/config");
const moment = require("moment-timezone");
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

class ProductsService {
    constructor(){
        }
    async create(req){
        const { name, cost, fk_supplier, lowest_price, list_price, amount, fk_branch, fk_user } = req.body;
        const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
      
        try {
                const response = await pool.query('INSERT INTO products (name, cost, created, lowest_price, list_price,fk_supplier) VALUES($1, $2, $3, $4, $5, $6 ) RETURNING id_product', [name, cost, fechaActual.toDate(), lowest_price, list_price,fk_supplier]);
                const newProductId = response.rows[0].id_product;
                //const response2 = await pool.query('INSERT INTO existence (amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1, $2, $3, $4, $5, $6)', [amount, fk_branch, newProductId, fk_user,fechaActual.toDate(),fechaActual.toDate()]);
                return `Product ${newProductId} created successfully`
              
        } catch (error) {
            console.log(error);
            return error
        }
        
    }
    async get(){
        try {
            const response = await pool.query(
                "SELECT * FROM products ORDER BY name ASC"
              );
             
              return response.rows
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async getById(req){
        try {
            const id = req.params.id
            const response = await pool.query("SELECT * FROM products WHERE id_product = $1", [id] )
            return response.rows
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async delete(req){
        try {
            const id = req.params.id
            console.log(response);
            const response = await pool.query("DELETE FROM products WHERE id_product = $1", [id] )
            return `Product: ${id} deleted successfully`
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async update(req){
        const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
        try {
            const { name, cost, lowest_price, list_price } = req.body;
            const id = req.params.id_product
            const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5  WHERE id_product = $6 ", [name, cost, lowest_price, list_price,fechaActual.toDate(), id] )
            
            return `Product: ${id} updated successfully`
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async getLatestUpdates(){
        try {
            const response = await pool.query("SELECT * FROM public.products ORDER BY id_product DESC LIMIT 7");
            return  response.rows
        } catch (error) {
            console.log(error);
            return error
        }
    }
}
 
module.exports = {ProductsService}

    
 
  

  