const express = require("express");
const config = require("./config/config");
const cors = require('cors');

const app = express();


app.use(express.urlencoded({extended: true})); //Esto es para formData

const port = 3000;



//donde va a encontrar los archivos estaticos
app.use(express.static("public"));

const routerApi = require("./routers/index_Router");

//esto para que el post reconozca el req.body
app.use(express.json());
app.use(cors());

//usamos los routers
routerApi(app);

//mongoDB
// const mongoose = require("mongoose");

// const user = config.config.dbUser;
// const password = config.config.dbPassword;
// const dbname = config.config.dbName;

// const urlBD = `mongodb+srv://${user}:${password}@cursoplatzi.yir1r.mongodb.net/${dbname}?retryWrites=true&w=majority`;

// //estás indicando a Mongoose que utilice la implementación de promesas global de JavaScript en lugar de su propia implementación. Esto significa que Mongoose utilizará las promesas nativas proporcionadas por la versión de Node.js en la que se esté ejecutando tu aplicación
// mongoose.Promise = global.Promise;

// mongoose
//   .connect(urlBD, {
//     //usar prametros actuales
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("base de datos conectada"))
//   .catch((e) => console.error(e));

const { Client } = require('pg');



const obtenerQuery = async () => {


  
  const client = new Client({
    user: 'postgres',
    host: 'database-2.ccwnygmfrk89.sa-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'lamejorpartedemi7',
    port: 5432,
    ssl:{
      rejectUnauthorized: false,
    },

  })
  await client.connect()
   
  const res = await client.query('SELECT * FROM users ORDER BY id ASC')
  const result = res.rows;
  await client.end()
  return result;
}
 obtenerQuery().then((result)=>{
  console.log(result);
 })



  app.listen(port, () => {
    console.log("empezando el server puerto " + port);
  });