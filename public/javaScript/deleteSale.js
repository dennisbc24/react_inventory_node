const urlBase = 'https://inventario.elwayardo.com'
//const urlBase = "http://localhost:3000";

const urlApi = `${urlBase}/api/v1/ventas`;

import { sendData } from "./funcions.js";



const btnPost = document.getElementById("sendData");

btnPost.addEventListener("click", async (e) => {
  e.preventDefault();

  const input = document.getElementById("idInput");

    const urlWithQuery =`${urlApi}?id=${input.value}`


 const server = await sendData(urlWithQuery,"DELETE");

  // Parsea el cuerpo de la respuesta como JSON


 // Trabaja con los datos obtenidos
 console.log(server);
  btnPost.classList.replace("botton_save", "botton_pressed");

  window.location.reload();

  alert('listo')
});


