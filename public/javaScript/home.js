const nombres = [];

const url = "http://localhost:8180/api/v1/products";
const urlFindOne = "http://localhost:8180/api/v1/products/findOne?name=";
fetch(url)
  .then((res) => res.json())
  .then((respuestaJson) => {
    respuestaJson.forEach((product) => {
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

      fetch(`${urlFindOne}${nombre}`)
        .then((res) => res.json())
        .then((resJson) => {
          const costo = resJson.costo;
          document.getElementById("costo").textContent = costo;
          document.getElementById("name").textContent = resJson.name;
          document.getElementById("stock").textContent = resJson.stock;
          document.getElementById("creacion").textContent = resJson.creacion;
          //debugger;
          const pt = document.getElementById("pt").textContent
          const cant = document.getElementById("cant").textContent
          const pu = pt / cant
          const utilidad = (pu - costo) * cant
          document.getElementById("pu").textContent = pu ;
          document.getElementById("utilidad").textContent = utilidad ;
        });
    };
    suggestionsList.appendChild(li);
  });
}
