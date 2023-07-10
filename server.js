const express = require("express");
const config = require("./config/config");

const app = express();

const port = 8180;
app.listen(port, () => {
  console.log("empezando el server puerto " + port);
});

//donde va a encontrar los archivos estaticos
app.use(express.static("public"));

const routerApi = require("./routers/index_Router");

//esto para que el post reconozca el req.body
app.use(express.json());

//usamos los routers
routerApi(app);

//mongoDB
const mongoose = require("mongoose");

const user = config.config.dbUser;
const password = config.config.dbPassword;
const dbname = config.config.dbName;

const urlBD = `mongodb+srv://${user}:${password}@cursoplatzi.yir1r.mongodb.net/${dbname}?retryWrites=true&w=majority`;

//estás indicando a Mongoose que utilice la implementación de promesas global de JavaScript en lugar de su propia implementación. Esto significa que Mongoose utilizará las promesas nativas proporcionadas por la versión de Node.js en la que se esté ejecutando tu aplicación
mongoose.Promise = global.Promise;

mongoose
  .connect(urlBD, {
    //usar prametros actuales
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("base de datos conectada"))
  .catch((e) => console.error(e));
