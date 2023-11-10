//fecha de la ventan por defecto
const dateSale = document.getElementById('inputDate')

const fechaActual = new Date();

const año = fechaActual.getFullYear();
const mes = fechaActual.getMonth() + 1; // Los meses van de 0 a 11, por lo que sumamos 1
const dia = fechaActual.getDate();
const fechaFormateada = `${año}-${mes}-${dia}`;

dateSale.value = fechaFormateada


const baseUrl = 'https://inventario.elwayardo.com'
//const baseUrl = 'http://localhost:3000'

const urlUpload = `${baseUrl}/api/v1/box`


const crearMovement = (formDataParam) => {

    fetch(urlUpload, {
      headers: {
        "Content-Type": "application/json", //esto fue para que el body no llegue vacio
      },
        method:'POST',
        
        body: formDataParam
    })
    
  };

  const btnPost = document.getElementById('press')

btnPost.addEventListener("click", async e => {
    e.preventDefault();
  
  const name = document.getElementById('input_name')
  const date = document.getElementById('inputDate')
  const amount = document.getElementById('inputAmount')
  const sucursal = document.getElementById('inputSucursal')

  
  
  const newMoneyMovement = {
    concept: name.value,
    amount: parseInt(amount.value),
    date: date.value,
    branch: sucursal.value
    
    
  }
  const movement = JSON.stringify(newMoneyMovement)
  
  await crearMovement(movement);
  
  btnPost.classList.replace('botton_save', 'botton_pressed');
  
  console.log('boton presionado');
  window.location.reload()
  
  });



function traer(){
	
  // const urlTest = 'http://localhost:3000/api/v1/ventas'
   const cajaGrande = document.getElementById('ultimed_movements');
   //cajaGrande.innerHTML = "";
   window
   .fetch(urlUpload)
     .then((respuesta)=> respuesta.json())
     .then((responseJson)=>{
       const todosLosElementos = [];
       responseJson.forEach((elemento) => {
         
           const div1  = document.createElement('div')
           div1.className = 'ultimed_sales_article'
 
           const amount = document.createElement('p');
             const amountApi = elemento.amount;
             amount.textContent = amountApi;
             
            
             const date = document.createElement('p');
             const dateApi = elemento.date;
             date.textContent = dateApi;
 
         
             const product = document.createElement('p');
             const productApi = elemento.concept;
             product.textContent = productApi;
             
             
 
             
             const total = document.createElement('p');
             const totalApit = elemento.branch;
             total.textContent = totalApit;
             
             
             div1.append(amount, date,product, total)
       
           todosLosElementos.push(div1);
 
           
 
           cajaGrande.append(...todosLosElementos);
           
           //masonryLayout(document.getElementById('articulos'), document.querySelectorAll('.articulos__container'), 2)
       });
   })
 }
 
 traer();
 
 
 
 
 