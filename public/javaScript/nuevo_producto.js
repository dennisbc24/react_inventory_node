const urlBase = 'https://inventario.elwayardo.com'
//const urlBase = 'http://localhost:3000'

const urlUpload = `${urlBase}/api/v1/products`
const urlLatest = `${urlBase}/api/v1/products/latestproducts`

const crearProduct = (formDataParam) => {

    fetch(urlUpload, {
      headers: {
        "Content-Type": "application/json", //esto fue para que el body no llegue vacio
      },
        method:'POST',
        
        body: formDataParam
    })
    
  };

  const btnPost = document.getElementById('crearProduct')

btnPost.addEventListener("click", async e => {
    e.preventDefault();
  
  const name = document.getElementById('input_name')
  const cost = document.getElementById('input_cost')
  const supplier = document.getElementById('inputSupplier')
  const lowest_price = document.getElementById('inputLastPrice')
  const list_price = document.getElementById('inputFirstPrice')
  
  
  const newProduct = {
    name: name.value,
    cost: parseInt(cost.value),
    supplier: supplier.value,
    lowest_price: parseInt(lowest_price.value),
    list_price: parseInt(list_price.value),
    
  }
  const product = JSON.stringify(newProduct)
  
  await crearProduct(product);
  
  btnPost.classList.replace('botton_save', 'botton_pressed');
  
  console.log('boton presionado');
  window.location.reload()
  
  });

  function traer(url) {
    
    const cajaGrande = document.getElementById("bodyTable");
    cajaGrande.innerHTML = "";
    window
      .fetch(url)
      .then((respuesta) => respuesta.json())
      .then((responseJson) => {
        const todosLosElementos = [];
        
        
        
        responseJson.forEach((elemento) => {
          const tr = document.createElement("tr");
              
      
              const id = document.createElement("td");
              const idApi = elemento.id_product;
              id.textContent = idApi;

              const name = document.createElement("td");
              const nameApi = elemento.name;
              name.textContent = nameApi;
  
              const cost = document.createElement("td");
              const costApi = elemento.cost;
              cost.textContent = costApi;

              const created = document.createElement("td");
              const createdApi = elemento.created;
              const cut = createdApi.substring(0,10);
              created.textContent = cut;

              const supplier = document.createElement("td");
              const supplierApi = elemento.supplier;
              supplier.textContent = supplierApi;
  

              const p_lista = document.createElement("td");
              const listaApi = elemento.list_price;
              p_lista.textContent = listaApi;
  
              const p_lowest = document.createElement("td");
              const lowestApi = elemento.lowest_price;
              p_lowest.textContent = lowestApi;
  
  
              
  
              tr.append(id,name,cost,created,supplier,p_lista,p_lowest);
  
          todosLosElementos.push(tr);
  
          cajaGrande.append(...todosLosElementos);
          
  
        });
        
          
          
         
          
      });
  }
  
  traer(urlLatest);
  