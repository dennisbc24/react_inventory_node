const nombres = [];
const articulos = [];

const suppliersNames = []
const suppliersAll = []

let id_product = ''
let id_supplier = 18

const urlBase = "https://inventario.elwayardo.com";
//const urlBase = 'http://localhost:3000'


const urlEntries = `${urlBase}/api/v1/entries`;
const urlSuppliers = `${urlBase}/api/v1/suppliers`;
const urlExist = `${urlBase}/api/v1/existence`;

const url = `${urlBase}/api/v1/products`;
const urlFindOne = `${urlBase}/api/v1/products/findOne?name=`;

const getExistence = (urlExistence) => {

    
  const cajaGrande = document.getElementById("bodyTableExistence");
  cajaGrande.innerHTML = "";
  window
    .fetch(urlExistence)
    .then((respuesta) => respuesta.json())
    .then((responseJson) => {
      const todosLosElementos = [];
      
      //const nodeSumTotal = document.getElementById('sumTotal')
      //const nodeSumRevenue = document.getElementById('sumRevenue')
      
      responseJson.forEach((elemento) => {
        const tr = document.createElement("tr");
        tr.className = "column_result"

            const branch = document.createElement("td");
            const branchApi = elemento.branch_name;
            branch.textContent = branchApi;
    
            const amount = document.createElement("td");
            const amountApi = elemento.amount;
            amount.textContent = amountApi;

            const name = document.createElement("td");
            const productApi = elemento.product;
            name.textContent = productApi;
           

            tr.append(branch,amount,name);

        todosLosElementos.push(tr);

        cajaGrande.append(...todosLosElementos);
        

      });
    });
};

fetch(url)
  .then((res) => res.json())
  .then((respuestaJson) => {
    respuestaJson.forEach((product) => {
      articulos.push(product);
      nombres.push(product.name);
    });
  });


  fetch(urlSuppliers)
  .then((res) => res.json())
  .then((respuestaJson) => {
    respuestaJson.forEach((supplier) => {
      suppliersAll.push(supplier);
      suppliersNames.push(supplier.name);
    });
  });


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
          
          document.getElementById("name").textContent = elem.name;
          
          id_product = elem.id_product;
        }
      });

      getExistence(`${urlExist}?product=${id_product}`)
    };
    suggestionsList.appendChild(li);
  });
}


function showSuggestionsSuppliers(inputValue) {
    const suggestionsList = document.getElementById("suggestionsSupplier");
    suggestionsList.innerHTML = "";
  
    if (inputValue.length === 0) {
      return;
    }
  
    const matchingNames = suppliersNames.filter((elemento) => elemento.toLowerCase().startsWith(inputValue.toLowerCase())  );
  
    matchingNames.forEach((nombre) => {
      const li = document.createElement("li");
      
      li.textContent = nombre;
      li.onclick = function async() {
        document.getElementById("searchSupplier").value = nombre;
  
        suggestionsList.innerHTML = "";
  
        suppliersAll.forEach((elem) => {
          if (elem.name == nombre) {
            
            document.getElementById("supplier").textContent = elem.name;
            
            id_supplier = elem.id_supplier;
          }
        });

        
      };
      suggestionsList.appendChild(li);

      
    });
  }

const enviarVenta = (formDataParam) => {
  fetch(urlEntries, {
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

  
  const sucurB = document.getElementById("pointB");
  const amount = document.getElementById("input1");
  
  const userId = document.getElementById("userSelect");
  const newSupplier = document.getElementById("searchSupplier")
  
  const ventaNueva = {
     
    pointB: sucurB.value,
    amount: amount.value,
    fk_user:userId.value,
    fk_supplier:id_supplier,
    fk_product: id_product,
    string_supplier: newSupplier.value

  };
  const sale = JSON.stringify(ventaNueva);

   await enviarVenta(sale);
  

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
            
        const branch = document.createElement("td");
        const branchApi = elemento.branch;
        branch.textContent = branchApi;

        const amount = document.createElement("td");
            const amountApi = elemento.amount;
            amount.textContent = amountApi;

            const product = document.createElement("td");
            const productApi = elemento.product;
            product.textContent = productApi;

            const user = document.createElement("td");
            const userApi = elemento.usuario;
            user.textContent = userApi;

            const date = document.createElement("td");
            const dateApi = elemento.updated;
            const cut = dateApi.substring(0,10);
            date.textContent = cut;

            const id = document.createElement("td");
            const idApi = elemento.id_entry;
            id.textContent = idApi;

   
            tr.append(branch,amount,product,user,date,id);

        todosLosElementos.push(tr);

        cajaGrande.append(...todosLosElementos);
        

      });
      
        
        
       
        
    });
}

traer(urlEntries);
