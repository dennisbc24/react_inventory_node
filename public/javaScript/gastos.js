//fecha de la ventan por defecto
const dateSale = document.getElementById('inputDate')

const fechaActual = new Date();

const año = fechaActual.getFullYear();
const mes = fechaActual.getMonth() + 1; // Los meses van de 0 a 11, por lo que sumamos 1
const dia = fechaActual.getDate();
const fechaFormateada = `${año}-${mes}-0${dia}`;

dateSale.value = fechaFormateada


const baseServer = 'https://inventario.elwayardo.com'
const baseLocal = 'http://localhost:3000'

const urlUpload = `${baseLocal}/api/v1/box`


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