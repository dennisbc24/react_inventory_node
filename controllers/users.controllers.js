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

const getUsers = async (req, res) => {
  const response = await pool.query("SELECT * FROM public.users ORDER BY name ASC");
 
  res.json(response.rows);
};


const createUser = async (req, res) => {
  const { name, password, email, nickname, lastname } = req.body;
    try {
      const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const response = await pool.query('INSERT INTO users (name, password, email, nickname, lastname) VALUES($1, $2, $3, $4, $5) RETURNING nickname', [name, passwordHash, email, nickname, lastname]);
    newNickName = response.rows[0].nickname;

  res.send(`user ${newNickName} created`);
  console.log(req.body)
  } catch (error) {
    console.log(error);
  }
   
};



module.exports = {getUsers, createUser}