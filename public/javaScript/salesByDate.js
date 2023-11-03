const urlBase = 'https://inventario.elwayardo.com'
const baseLocal = 'http://localhost:3000'





function traer(url) {
  
  
  
    // const urlTest = 'http://localhost:3000/api/v1/ventas'
  const cajaGrande = document.getElementById("ultimed_sales");
  cajaGrande.innerHTML = "";
  window
    .fetch(url)
    .then((respuesta) => respuesta.json())
    .then((responseJson) => {
      const todosLosElementos = [];
      let sumAllSales = [];
      let sumRevenue = [];
      
      responseJson.forEach((elemento) => {
        const div1 = document.createElement("div");

        const amount = document.createElement("p");
        const amountApi = elemento.amount;
        amount.textContent = amountApi;

        div1.className = "ultimed_sales_article";

        const product = document.createElement("p");
        const productApi = elemento.product;
        product.textContent = productApi;

        const total = document.createElement("p");
        const getTotal = elemento.p_total
        sumAllSales.push(parseInt(getTotal))
        const totalApi = `S/.${getTotal}`;
        total.textContent = totalApi;

        const revenue = document.createElement("p");
        const getRevenue = elemento.revenue
        sumRevenue.push(parseInt(getRevenue))
        const revenueApi = `S/.${getRevenue}`;
        revenue.textContent = revenueApi;
        

        div1.append(amount, product, total, revenue);

        todosLosElementos.push(div1);

        cajaGrande.append(...todosLosElementos);

        //masonryLayout(document.getElementById('articulos'), document.querySelectorAll('.articulos__container'), 2)
      });
      
        
        
       
        let ganancia = sumRevenue.reduce((a, b) => a + b, 0);
        let total = sumAllSales.reduce((a, b) => a + b, 0);

console.log(ganancia, total);
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


