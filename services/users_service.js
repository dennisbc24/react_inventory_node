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

class UserService {
    constructor(){

    }
    async findAll () {
        try {
            const response = await pool.query("SELECT * FROM public.users ORDER BY name ASC");
        return response.rows;
        } catch (error) {
            console.log(error);
        }
        
    }
    async create (body) {
        const { name, password, email, nickname, lastname } = body;
        const response = await pool.query("SELECT * FROM public.users ORDER BY name ASC");
        try {
            const saltRounds = 10
          const passwordHash = await bcrypt.hash(password, saltRounds)
          const response = await pool.query('INSERT INTO users (name, password, email, nickname, lastname) VALUES($1, $2, $3, $4, $5) RETURNING nickname', [name, passwordHash, email, nickname, lastname]);
          const newNickName = response.rows[0].nickname;
      
        const message = `user ${newNickName} created`;
        return message;
                
        } catch (error) {
          console.log(error);
        }
    }
    async findByEmail(email){
        try {
            const response = await pool.query("SELECT * FROM public.users WHERE email = $1", [email]);
            return response.rows;
        
        } catch (error) {
            console.log(error);
        }
    }
    async  getCash(id) {
        try {
            const response = await pool.query("SELECT cash, name FROM public.users where id_user=$1", [id])
            return response.rows
        } catch (error) {
            
        }
    }
}

module.exports = {UserService}