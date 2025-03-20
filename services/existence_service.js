const { Pool } = require("pg");
const bcrypt = require('bcrypt')

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

class ExistenceService {
    constructor(){

    }
    
    async updateCount (body) {
        const { id_product, id_branch, count, id_existence } = body;
        console.log(body);
        
      if (id_branch != undefined && id_product != undefined && count != undefined) {
        try {
            
          const query = await pool.query('UPDATE existence SET amount=$1 WHERE fk_branch=$2 AND fk_product=$3', [count,id_branch, id_product ]);
      
        const message = `product ${id_product} updated`;
        return message;
                
        } catch (error) {
          console.log(error);
        }
        
      }
      if (id_existence != undefined && count != undefined) {
        try {
            
          const query = await pool.query('UPDATE existence SET amount=$1 WHERE id_existence=$2', [count,id_existence]);
      
        const message = `count product updated`;
        return message;
                
        } catch (error) {
          console.log(error);
        }
        
      }
    }
}

module.exports = {ExistenceService}

