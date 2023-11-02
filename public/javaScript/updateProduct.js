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
          document.getElementById("codigo").textContent = elem.id_product;
          document.getElementById("inputName").value = elem.name;
          document.getElementById("inputCost").value = elem.cost;
          document.getElementById("creacion").textContent = elem.created;
          document.getElementById("supplier").textContent = elem.supplier;
          document.getElementById("inputfirstPrice").value = elem.list_price;
          document.getElementById("inputlowestPrice").value = elem.lowest_price;
        }
      });
    };
    suggestionsList.appendChild(li);
  });
}



const enviarVenta = (formDataParam, url) => {

  fetch(url, {
    headers: {
      "Content-Type": "application/json", //esto fue para que el body no llegue vacio
    },
      method:'PATCH',
      
      body: formDataParam
  })
  
};

const btnPost = document.getElementById('finalizar')

btnPost.addEventListener("click", async e => {
  e.preventDefault();

const id_product = document.getElementById('codigo')
const nameInput = document.getElementById('inputName')
const costInput = document.getElementById('inputCost')
const firstPriceInput = document.getElementById('inputfirstPrice')
const lowestPriceInput = document.getElementById('inputlowestPrice')

const id_for_update = id_product.textContent

const urlPost = `${baseLocal}/api/v1/products/${id_for_update}`
console.log(urlPost);
const newDates = {
  
  name: nameInput.value,
  cost: costInput.value,
  list_price: firstPriceInput.value,
  lowest_price: lowestPriceInput.value,

}
const product = JSON.stringify(newDates)
await enviarVenta(product, urlPost);
btnPost.classList.replace('botton_save', 'botton_pressed');
window.location.reload()

});




function traer(){
	
 // const urlTest = 'http://localhost:3000/api/v1/ventas'
  const cajaGrande = document.getElementById('ultimed_sales');
  //cajaGrande.innerHTML = "";
	window
	.fetch(urlUpload)
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



const btnUpdate = document.getElementById('updateButton')
const titulo = document.getElementById('titulo')
const searchInput = document.getElementById('searchInput')


