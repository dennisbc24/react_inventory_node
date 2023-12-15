const nombres = [];
const articulos = [];

let id_product = ''

const urlBase = "https://inventario.elwayardo.com";
//const urlBase = 'http://localhost:3000'

const urlUpload = `${urlBase}/api/v1/existence`;

const url = `${urlBase}/api/v1/products`;
const urlFindOne = `${urlBase}/api/v1/products/findOne?name=`;
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

  const matchingNames = nombres.filter((elemento) => elemento.toLowerCase().startsWith(inputValue.toLowerCase())  );

  matchingNames.forEach((nombre) => {
    const li = document.createElement("li");
    
    li.textContent = nombre;
    li.onclick = function async() {
      document.getElementById("searchInput").value = nombre;

      suggestionsList.innerHTML = "";

      articulos.forEach((elem) => {
        if (elem.name == nombre) {
          
          document.getElementById("name").textContent = elem.name;
          
          id_product = elem.id_product
        }
      });
    };
    suggestionsList.appendChild(li);
  });
}



const enviarVenta = (formDataParam) => {
  fetch(urlUpload, {
    headers: {
      "Content-Type": "application/json", //esto fue para que el body no llegue vacio
    },
    method: "POST",

    body: formDataParam,
  });
};

const btnPost = document.getElementById("finalizar");

btnPost.addEventListener("click", async (e) => {
  e.preventDefault();

  const sucur = document.getElementById("sucursal");
  const amount = document.getElementById("input1");
  const fkUser = document.getElementById("userSelect");
  

  const newExistence = {
    fk_branch: sucur.value,
    amount: amount.value,
    fk_product: id_product,
    fk_user: fkUser.value
  };
  const date = JSON.stringify(newExistence);

  await enviarVenta(date);

  btnPost.classList.replace("botton_save", "botton_pressed");

  console.log("boton presionado");
  window.location.reload();
});

