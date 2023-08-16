const nombres = [];
const articulos = [];
const todo = [];

const urlUpload = 'http://localhost:8180/api/v1/ventas'

const url = "http://localhost:8180/api/v1/products";
const urlFindOne = "http://localhost:8180/api/v1/products/findOne?name=";
fetch(url)
  .then((res) => res.json())
  .then((respuestaJson) => {
    respuestaJson.forEach((product) => {
      articulos.push(product);
      nombres.push(product.name);
    });
  });

/* 
En este ejemplo, el input de búsqueda tiene un evento oninput que llama a la función showSuggestions() cada vez que se escribe algo en el campo de entrada. La función showSuggestions() obtiene el valor del input y busca nombres que coincidan en el array nombres. Luego, crea elementos <li> para cada nombre coincidente y los agrega como elementos secundarios de la lista <ul> con el id suggestionsList.
Cuando haces clic en una sugerencia, el valor del input se establece en el nombre seleccionado y la lista de sugerencias se vacía.
Puedes ajustar este código según tus necesidades, como modificar el array nombres o cambiar el estilo CSS de la lista de sugerencias.
 */

function showSuggestions(inputValue) {
  const suggestionsList = document.getElementById("suggestionsList");
  suggestionsList.innerHTML = "";

  if (inputValue.length === 0) {
    return;
  }

  const matchingNames = nombres.filter((nombre) =>
    nombre.toLowerCase().startsWith(inputValue.toLowerCase())
  );

  matchingNames.forEach((nombre) => {
    const li = document.createElement("li");
    li.textContent = nombre;
    li.onclick = function async() {
      document.getElementById("searchInput").value = nombre;

      suggestionsList.innerHTML = "";

      articulos.forEach((elem) => {
        if (elem.name == nombre) {
          document.getElementById("costo").textContent = elem.costo;
          document.getElementById("name").textContent = elem.name;
          document.getElementById("stock").textContent = elem.stock;
          document.getElementById("creacion").textContent = elem.creacion;
        }
      });
    };
    suggestionsList.appendChild(li);
  });
}

function multiplyValues() {
  // Obtenemos los valores de los inputs
  const input1 = parseFloat(document.getElementById("input1").value);
  const input2 = parseFloat(document.getElementById("input2").value);

  // Verificamos que ambos valores sean números válidos
  if (!isNaN(input1) && !isNaN(input2)) {
    // Realizamos la division
    const pUnitario = input2 / input1;
    const util = (pUnitario - costo.textContent) * input1;
    console.log(util);
    document.getElementById("util").textContent = util;
    // Mostramos el resultado en el elemento con id "resultado"
    document.getElementById("resultado").textContent = pUnitario;
  } else {
    // Si alguno de los valores no es válido, mostramos un mensaje de error
    document.getElementById("resultado").textContent =
      "Error: Ingresa números válidos";
  }
}

const enviarVenta = (formDataParam) => {

  fetch(urlUpload,{
      method:'POST',
      body: JSON.stringify(formDataParam),
      headers:{'Content-Type': 'application/json'}
  })
  .then(function(response) {
    console.log(formDataParam);
    return response.text();
  })
  .then(function(data) {
    
    console.log(data); // Manejar la respuesta del servidor si es necesario
  })
  .catch(function(error) {
    console.error('Error:', error);
  });
};

const btnPost = document.getElementById('finalizar')



btnPost.addEventListener("click", async (event) => {
  event.preventDefault();
//const form = document.getElementById("formulario");
const venta = new FormData

//const venta = new FormData(form)
const sucur = document.getElementById('sucursal')
const resul = document.getElementById('resultado')
const item = document.getElementById('name')
const utilidad = document.getElementById('util')

const productoNuevo = {
  Sucursal: sucur.textContent,
  pu: parseInt(resul.textContent),
  Articulo: item.textContent,
  utilidad: parseInt(utilidad.textContent),

  
}



venta.append('productoNuevo', productoNuevo)

  console.log("todo bien");
  

   await enviarVenta(venta);
  console.log("funcion ejecutada");
});
