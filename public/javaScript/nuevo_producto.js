const urlBase = 'https://inventario.elwayardo.com'
const baseLocal = 'http://localhost:3000'

const urlUpload = `${urlBase}/api/v1/products`


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