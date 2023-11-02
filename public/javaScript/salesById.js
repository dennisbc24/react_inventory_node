const urlBase = 'https://inventario.elwayardo.com'
const baseLocal = 'http://localhost:3000'



const urlInsomnia = `${urlBase}/api/v1/ventas/salesByDate?date=2023-11-01`

function traer() {
  
  
  
    // const urlTest = 'http://localhost:3000/api/v1/ventas'
  const cajaGrande = document.getElementById("salesByDate");
  //cajaGrande.innerHTML = "";
  window
    .fetch(urlInsomnia)
    .then((respuesta) => respuesta.json())
    .then((responseJson) => {
      const todosLosElementos = [];
      responseJson.forEach((elemento) => {
        const div1 = document.createElement("div");

        const amount = document.createElement("p");
        const amountApi = elemento.amount;
        amount.textContent = amountApi;

        div1.className = "sales_article_byDate";

        const product = document.createElement("p");
        const productApi = elemento.product;
        product.textContent = productApi;

        const total = document.createElement("p");
        const totalApi = elemento.p_total;
        total.textContent = totalApi;

        const revenue = document.createElement("p");
        const revenueApi = elemento.revenue;
        revenue.textContent = revenueApi;

        div1.append(amount, product, total, revenue);

        todosLosElementos.push(div1);

        cajaGrande.append(...todosLosElementos);

        //masonryLayout(document.getElementById('articulos'), document.querySelectorAll('.articulos__container'), 2)
      });
    });
}

traer();
