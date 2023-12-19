const nombres = [];
const articulos = [];
const todo = [];

let id_product = ''

const urlBase = "https://inventario.elwayardo.com";
//const urlBase = 'http://localhost:3000'


const urlUpload = `${urlBase}/api/v1/ventas`;
const urlUploadVendings = `${urlBase}/api/v1/ventas/vendings`;
const urlUMofifyExistence = `${urlBase}/api/v1/existence/vendings`;

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

//fecha de la ventan por defecto
const dateSale = document.getElementById("dateSale");

const fechaActual = new Date();

const año = fechaActual.getFullYear();
const mes = fechaActual.getMonth() + 1; // Los meses van de 0 a 11, por lo que sumamos 1
const dia = fechaActual.getDate();
const fechaFormateada = `${año}-${mes}-${dia}`;

dateSale.value = fechaFormateada;

/* 
En este ejemplo, el input de búsqueda tiene un evento oninput que llama a la función showSuggestions() cada vez que se escribe algo en el campo de entrada. La función showSuggestions() obtiene el valor del input y busca nombres que coincidan en el array nombres. Luego, crea elementos <li> para cada nombre coincidente y los agrega como elementos secundarios de la lista <ul> con el id suggestionsList.
Cuando haces clic en una sugerencia, el valor del input se establece en el nombre seleccionado y la lista de sugerencias se vacía.
Puedes ajustar este código según tus necesidades, como modificar el array nombres o cambiar el estilo CSS de la lista de sugerencias.
 */

function normalizeString(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


function showSuggestions(inputValue) {
  
    const suggestionsList = document.getElementById("suggestionsList");
  suggestionsList.innerHTML = "";

  if (inputValue.length === 0) {
    return;
  }

  const matchingNames = nombres.filter((elemento) => normalizeString(elemento).includes(inputValue.toLowerCase())  );

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
          id_product = elem.id_product;
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
  fetch(urlUploadVendings, {
    headers: {
      "Content-Type": "application/json", //esto fue para que el body no llegue vacio
    },
    method: "POST",

    body: formDataParam,
  });
};

const modifyStock = (formDataParam) => {
  fetch(urlUMofifyExistence, {
    headers: {
      "Content-Type": "application/json", //esto fue para que el body no llegue vacio
    },
    method: "PATCH",

    body: formDataParam,
  });
};
const btnPost = document.getElementById("finalizar");

btnPost.addEventListener("click", async (e) => {
  e.preventDefault();

  const sucur = document.getElementById("sucursal");
  const amount = document.getElementById("input1");
  const p_total = document.getElementById("input2");
  const resul = document.getElementById("resultado");
  const userId = document.getElementById("userSelect");
  const utilidad = document.getElementById("util");
  const customer = document.getElementById("inputCustomer")
  const name = document.getElementById("name")

  const ventaNueva = {
   
    date: dateSale.value,
    amount: amount.value,
    p_total: p_total.value,
    p_unit: parseInt(resul.textContent),
    revenue: parseInt(utilidad.textContent),
    customer: customer.value,
    fk_id_product: id_product,
    fk_id_user: userId.value,
    fk_id_branch:sucur.value,
    branch:'nuevo',
    product:name.textContent
  };
  const sale = JSON.stringify(ventaNueva);

  

  const ToModify = {
    amount: amount.value, 
    fk_branch: sucur.value, 
    fk_product:id_product, 
    fk_user:userId.value
    
  };
  const dataToModify = JSON.stringify(ToModify);

  await enviarVenta(sale);
  await modifyStock(dataToModify);

  btnPost.classList.replace("botton_save", "botton_pressed");

  console.log("boton presionado");
  window.location.reload();
});


function traer(url) {
    
  const cajaGrande = document.getElementById("bodyTable");
  cajaGrande.innerHTML = "";
  window
    .fetch(url)
    .then((respuesta) => respuesta.json())
    .then((responseJson) => {
      const todosLosElementos = [];
      
      const nodeSumTotal = document.getElementById('sumTotal')
      const nodeSumRevenue = document.getElementById('sumRevenue')
      
      responseJson.forEach((elemento) => {
        const tr = document.createElement("tr");
            
    
            const id = document.createElement("td");
            const idApi = elemento.id_sale;
            id.textContent = idApi;

            const branch = document.createElement("td");
            const branchApi = elemento.branch;
            branch.textContent = branchApi;

            const date = document.createElement("td");
            const dateApi = elemento.date;
            const cut = dateApi.substring(0,10);
            date.textContent = cut;

            const amount = document.createElement("td");
            const amountApi = elemento.amount;
            amount.textContent = amountApi;

            const product = document.createElement("td");
            const productApi = elemento.product;
            product.textContent = productApi;

            const p_total = document.createElement("td");
            const totalApi = elemento.p_total;
            p_total.textContent = totalApi;

            const p_unit = document.createElement("td");
            const unitApi = elemento.p_unit;
            p_unit.textContent = unitApi;

            const revenue = document.createElement("td");
            const revenueApi = elemento.revenue;
            revenue.textContent = revenueApi;

            const hour = document.createElement("td");
            const hourApi = elemento.hour;
            hour.textContent = hourApi;

            const customer = document.createElement("td");
            const custumerApi = elemento.customer;
            customer.textContent = custumerApi;

            

            tr.append(id,branch,date,amount,product,p_total,p_unit,revenue,hour,customer);

        todosLosElementos.push(tr);

        cajaGrande.append(...todosLosElementos);
        

      });
 
        
    });
}

traer(urlUpload);






const products = ["sartén grande facusa", "sartén facusa pequeña"];

function normalizeString(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function highlightMatches(product, searchInput) {
  const normalizedProduct = normalizeString(product);
  const startIndex = normalizedProduct.indexOf(searchInput);
  
  if (startIndex !== -1) {
    const highlightedText = product.substring(0, startIndex) +
      '<span class="highlight">' + product.substring(startIndex, startIndex + searchInput.length) + '</span>' +
      product.substring(startIndex + searchInput.length);
    return highlightedText;
  } else {
    return product;
  }
}

function searchSuggestions() {
  const searchInput = normalizeString(document.getElementById("searchInput").value);
  const suggestionsList = document.getElementById("suggestionsList");

  // Clear previous suggestions
  suggestionsList.innerHTML = "";

  // Filter products based on normalized input
  const filteredProducts = products.filter(product => normalizeString(product).includes(searchInput));

  // Display suggestions with highlighted matches
  filteredProducts.forEach(product => {
    const listItem = document.createElement("li");
    listItem.innerHTML = highlightMatches(product, searchInput);
    suggestionsList.appendChild(listItem);
  });
}
