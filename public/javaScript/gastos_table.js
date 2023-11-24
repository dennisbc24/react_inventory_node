//const urlBase = 'https://inventario.elwayardo.com'
const urlBase = 'http://localhost:3000'



function traerGastos(url) {
    const cajaGrande = document.getElementById("bodyTable");
    cajaGrande.innerHTML = "";
    window
      .fetch(url)
      .then((respuesta) => respuesta.json())
      .then((responseJson) => {
        const todosLosElementos = [];
        //const conteo = [];
  
        responseJson.forEach((elemento) => {
  
          
            const tr = document.createElement("tr");
            //div1.className = "row_summary";
    
            const id = document.createElement("td");
            const idApi = elemento.id_money_movement;
            id.textContent = idApi;

            const concept = document.createElement("td");
            const conceptApi = elemento.concept;
            concept.textContent = conceptApi;

            const date = document.createElement("td");
            const dateApi = elemento.date;
            const cut = dateApi.substring(0,10);
            date.textContent = cut;

            const amount = document.createElement("td");
            const amountApi = elemento.amount;
            amount.textContent = `S/.${amountApi}`;

            const branch = document.createElement("td");
            const branchApi = elemento.branch;
            branch.textContent = branchApi;

            const bill = document.createElement("td");
            const billApi = elemento.bill;
            bill.textContent = billApi;
    
            
    
            
    
            tr.append(id,concept, date,amount,branch, bill);
    
            todosLosElementos.push(tr);
    
            cajaGrande.append(...todosLosElementos);
  
            //conteo.push(elemento.amount)
          
          
        });
        /* const suma = conteo.reduce((total, objeto)=>total + parseFloat(objeto), 0);
        const total = document.createElement("div")
        total.className = 'total_summary'
        const titulo = document.createElement("p")
        titulo.textContent="Total Gastos"
        const sumSummary = document.createElement("p");
        sumSummary.id = "sumBils"
        sumSummary.textContent = suma;
        total.append(titulo, sumSummary)
        cajaGrande.append(total) */
      });
  }




  const btnGet = document.getElementById("getSales");

btnGet.addEventListener("click", async (e) => {
  e.preventDefault();

  const inputMonth = document.getElementById("inputMonth");

  const date = inputMonth.value;
  const year = date.substring(0, 4);
  const month = date.substring(5, 7);
  const urlInsomnia = `${urlBase}/api/v1/ventas/salesByMonth?year=${year}&month=${month}`;
  const urlInsomnia2 = `${urlBase}/api/v1/box/byMonth?year=${year}&month=${month}`;
  
  //traerGanancia(urlInsomnia);
  traerGastos(urlInsomnia2);
});