const nombres = [];
const articulos = [];
const todo = [];

const urlBase = 'https://inventario.elwayardo.com'
const baseLocal = 'http://localhost:3000'

const urlUpload = `${urlBase}/api/v1/ventas`


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
          document.getElementById("costo").textContent = elem.cost;
          document.getElementById("name").textContent = elem.name;
          document.getElementById("stock").textContent = elem.stock;
          document.getElementById("creacion").textContent = elem.created;
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

  fetch(urlUpload, {
    headers: {
      "Content-Type": "application/json", //esto fue para que el body no llegue vacio
    },
      method:'POST',
      
      body: formDataParam
  })
  
};

const btnPost = document.getElementById('finalizar')

btnPost.addEventListener("click", async e => {
  e.preventDefault();

/* const sucur = document.getElementById('sucursal')
const amount = document.getElementById('input1')
const p_total = document.getElementById('input2')
const resul = document.getElementById('resultado')
const item = document.getElementById('name')
const utilidad = document.getElementById('util')

const ventaNueva = {
  branch: sucur.textContent,
  amount: amount.value,
  product: item.textContent,
  p_total: p_total.value,
  p_unit: parseInt(resul.textContent),
  revenue: parseInt(utilidad.textContent),
}
const sale = JSON.stringify(ventaNueva)

await enviarVenta(sale); */

btnPost.classList.replace('botton_save', 'botton_pressed');

console.log('boton presionado');
window.location.reload()

});




function traer(){
	
  const urlTest = 'http://localhost:3000/api/v1/ventas'
  const cajaGrande = document.getElementById('ultimed_sales');
  //cajaGrande.innerHTML = "";
	window
	.fetch(urlTest)
		.then((respuesta)=> respuesta.json())
		.then((responseJson)=>{
			const todosLosElementos = [];
			responseJson.forEach((elemento) => {
				
					const div1  = document.createElement('div')


					const amount = document.createElement('p');
						const amountApi = elemento.amount;
            amount.textContent = amountApi;
            
            div1.className = 'ultimed_sales_article'
            

        
            const product = document.createElement('p');
						const productApi = elemento.product;
            product.textContent = productApi;
            
            

            
            const total = document.createElement('p');
						const totalApit = elemento.p_total;
            total.textContent = totalApit;
            
            
            div1.append(amount, product, total)
      
					todosLosElementos.push(div1);

					

					cajaGrande.append(...todosLosElementos);
					
          //masonryLayout(document.getElementById('articulos'), document.querySelectorAll('.articulos__container'), 2)
			});
	})
}

traer();




