const urlBase = 'https://inventario.elwayardo.com'
//const urlBase = 'http://localhost:3000'

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
            
            const amount = document.createElement("td");
            const amountApi = elemento.amount;
            amount.textContent = amountApi;

            const product = document.createElement("td");
            const productApi = elemento.product;
            product.textContent = productApi;
    
            const costo = document.createElement("td");
            const costoApi = elemento.costo;
            costo.textContent = `S/.${costoApi}`;

            const branch = document.createElement("td");
            const branchApi = elemento.sucursal;
            branch.textContent = branchApi;

            

            tr.append(amount,product,costo,branch);

        todosLosElementos.push(tr);

        

      });
       
      cajaGrande.append(...todosLosElementos);
      
      
    });
}


const btnGet = document.getElementById('getSales')

btnGet.addEventListener('click', async e => {
  e.preventDefault();

  const inputDate = document.getElementById('dateSales')
  
  const urlInsomnia = `${urlBase}/api/v1/existence/inventary?branch=${inputDate.value}`
  
  
  traer(urlInsomnia);
})