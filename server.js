const express = require("express");

const cors = require('cors');

const app = express();
//esto para que el post reconozca el req.body 
//tener en cuenta si el frontend y el backend estan en las misma ruta el body llegara vacio
app.use(express.json());
app.use(cors());

app.use(express.json());   //esto para que el post reconozca el req.body //tener en cuenta si el frontend y el backend estan en las misma ruta el body llegara vacio
app.use(cors());
app.use(express.urlencoded({extended: true})); //Esto es para formData

const port = 3000;

//donde va a encontrar los archivos estaticos
app.use(express.static("public"));

const routerApi = require("./routers/index_Router");
const { now } = require("mongoose");

//esto para que el post reconozca el req.body 
//tener en cuenta si el frontend y el backend estan en las misma ruta el body llegara vacio
app.use(express.json());
app.use(cors());

//usamos los routers
routerApi(app);

  app.listen(port, () => {
    console.log("empezando el server puerto " + port);
  });


// Crear un objeto Date para obtener la fecha actual
const fechaActual = new Date();

// Obtener los componentes de la fecha (año, mes, día)
const año = fechaActual.getFullYear();
const mes = fechaActual.getMonth() + 1; // Los meses van de 0 a 11, por lo que sumamos 1
const dia = fechaActual.getDate();

// Obtener los componentes de la hora (hora, minuto, segundo)
const hora = fechaActual.getHours();
const minuto = fechaActual.getMinutes();
const segundo = fechaActual.getSeconds();

// Formatear la fecha y la hora como desees
const fechaFormateada = `${año}-${mes}-${dia}`;
const horaFormateada = `${hora}:${minuto}:${segundo}`;

// Mostrar la fecha y hora en la consola o en la página web
console.log("Fecha actual: " + fechaFormateada);
console.log("Hora actual: " + horaFormateada);

  
  
 
