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
      let sumAllSales = [];
      let sumRevenue = [];
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
        sumAllSales.push(elemento.p_total)
        sumRevenue.push(elemento.revenue)

      });
      
        
        
       
        let ganancia = sumRevenue.reduce((a, b) => a + parseFloat(b), 0);
        let total = sumAllSales.reduce((a, b) => a + parseFloat(b), 0);

        nodeSumTotal.textContent = `Total venta: S/.${total}`
        nodeSumRevenue.textContent = `Total ganancia: S/.${ganancia}`
    });
}


const btnGet = document.getElementById('getSales')

btnGet.addEventListener('click', async e => {
  e.preventDefault();

  const inputDate = document.getElementById('dateSales')
  const titleText = document.getElementById('titleText')
  const urlInsomnia = `${urlBase}/api/v1/ventas/salesByDate?date=${inputDate.value}`
  titleText.textContent = inputDate.value
  
  traer(urlInsomnia);
})


