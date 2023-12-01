function traer(url) {
    
    const cajaGrande = document.getElementById("bodyTable");
    cajaGrande.innerHTML = "";
    window
      .fetch(url)
      .then((respuesta) => respuesta.json())
      .then((responseJson) => {
        //const todosLosElementos = [];
        
        responseJson.forEach(element => {
         
         const revenueArray = element.revenue
         const rentArray = element.rent
         const spentArray = element.spent
         const salariesArray = element.salaries
         const utilityArray = element.utility
         const dividingArray = element.dividing
         const monthArray = element.month_summary

         console.log(`Correspondiente al mes de: ${monthArray}`);
         revenueArray.forEach(e => {
            const nombre = e.nombre
            const monto = e.monto
            console.log(`La ganancia de ${nombre} es: ${monto}`);
         });

         rentArray.forEach(e => {
            const nombre = e.nombre
            const monto = e.monto
            console.log(`El alquiler de ${nombre} es: ${monto}`);
         });

         console.log(`Gastos: ${spentArray}`);


         salariesArray.forEach(e => {
            const nombre = e.nombre
            const monto = e.monto
            console.log(`El sueldo de ${nombre} es: ${monto}`);
         });
console.log(`La utilidad de la empresa es ${utilityArray}`);
         dividingArray.forEach(e => {
            const nombre = e.nombre
            const monto = e.monto
            console.log(`El dividendo de ${nombre} es: ${monto}`);
         });
       });

       
        
          
          
         
      });
  }
  

  traer('http://localhost:3000/api/v1/summaries')