const express = require("express");

const cors = require('cors');

const app = express();

app.use(express.json());   //esto para que el post reconozca el req.body //tener en cuenta si el frontend y el backend estan en las misma ruta el body llegara vacio
app.use(cors());
app.use(express.urlencoded({extended: true})); //Esto es para formData

const port = 3000;

//donde va a encontrar los archivos estaticos
app.use(express.static("public"));

const routerApi = require("./routers/index_Router");

//usamos los routers
routerApi(app);

  app.listen(port, () => {
    console.log("empezando el server puerto " + port);
  });


  
  
 
