//const urlBase = 'https://inventario.elwayardo.com'
const urlBase = 'http://localhost:3000'





function traer(url) {
    // const urlTest = 'http://localhost:3000/api/v1/ventas'
  const cajaGrande = document.getElementById("summary");
  cajaGrande.innerHTML = "";
  window
    .fetch(url)
    .then((respuesta) => respuesta.json())
    .then((responseJson) => {
      const todosLosElementos = [];
     
      
      responseJson.forEach((elemento) => {
        const div1 = document.createElement("div");

        const amount = document.createElement("p");
        const amountApi = elemento.branch;
        amount.textContent = amountApi;

        div1.className = "ultimed_sales_article";

        const product = document.createElement("p");
        const productApi = elemento.mes;
        product.textContent = productApi;

        

        

        div1.append(amount, product, total);

        todosLosElementos.push(div1);

        cajaGrande.append(...todosLosElementos);

        //masonryLayout(document.getElementById('articulos'), document.querySelectorAll('.articulos__container'), 2)
      });
      
        
        
       
        /* let ganancia = sumRevenue.reduce((a, b) => a + b, 0);
        let total = sumAllSales.reduce((a, b) => a + b, 0);

        nodeSumTotal.textContent = `Total venta: S/.${total}`
        nodeSumRevenue.textContent = `Total ganancia: S/.${ganancia}` */
    });
}


const btnGet = document.getElementById('getSales')

btnGet.addEventListener('click', async e => {
  e.preventDefault();

  const inputMonth = document.getElementById('inputMonth')
  
  
  
  const date = inputMonth.value;
    const month = date.substring(0,4)
    const year = date.substring(5,7)
    const urlInsomnia = `${urlBase}/api/v1/ventas/salesByMonth?year=${year}&month=${month}`
    
  traer(urlInsomnia);
})