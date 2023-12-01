const urlBase = 'https://inventario.elwayardo.com'
//const urlBase = 'http://localhost:3000'

function traer(url) {
    
    const cajaGrande = document.getElementById("bodyTable");
    cajaGrande.innerHTML = "";
    window
      .fetch(url)
      .then((respuesta) => respuesta.json())
      .then((responseJson) => {
        //const todosLosElementos = [];
        const todosLosElementos = [];
        responseJson.forEach(element => {
         //datos
         const revenueArray = element.revenue
         const rentArray = element.rent
         const spent = element.spent
         const salariesArray = element.salaries
         const utilityArray = element.utility
         const dividingArray = element.dividing
         const monthArray = element.month_summary

         console.log(`Correspondiente al mes de: ${monthArray}`);
         //revenue
         revenueArray.forEach(e => {
            
            const nombreRevenue = e.nombre
            const montoRevenue = e.monto

            const trGanancia = document.createElement('tr')
         
            const nameRevenue = document.createElement('td')
            const amountRevenue = document.createElement('td')
            nameRevenue.textContent = `Ganancia ${nombreRevenue}`
            amountRevenue.textContent = `S/.${montoRevenue}`

            trGanancia.append(nameRevenue, amountRevenue)
            todosLosElementos.push(trGanancia)
            
         });
         //rent
         const sumRent = [];
         rentArray.forEach(e => {
            const trAlquiler = document.createElement('tr')
            const nombre = e.nombre
            const monto = e.monto
            const name = document.createElement('td')
            const amount = document.createElement('td')
            name.textContent = `Alquiler de ${nombre}`
            amount.textContent = `S/.${monto}`

            sumRent.push(monto)

            trAlquiler.append(name, amount)
            todosLosElementos.push(trAlquiler)  
            
         });
         const trSumRent = document.createElement('tr')
         const nameSumRent = document.createElement('th')
         const amountSumRent = document.createElement('th')
         nameSumRent.textContent = 'Total alquileres'
         const sumRentText = sumRent.reduce((a, b) => a + parseFloat(b), 0);
         amountSumRent.textContent = `S/.${sumRentText}`
         trSumRent.append(nameSumRent,amountSumRent)
         todosLosElementos.push(trSumRent)

         //Bills
         const trBills = document.createElement('tr')
         const nameSpent = document.createElement('th')
         const amountSpent = document.createElement('th')
         nameSpent.textContent = 'Total Gasto'
         amountSpent.textContent = `S/.${spent}`
         trBills.append(nameSpent, amountSpent)
         todosLosElementos.push(trBills)
         

         //salaries
         salariesArray.forEach(e => {
            const trSalaries = document.createElement('tr')
            const nombreSal = e.nombre
            const montoSal = e.monto
            const nameSal = document.createElement('td')
            const amountSal = document.createElement('td')
            nameSal.textContent = `Sueldo ${nombreSal}`
            amountSal.textContent = `S/.${montoSal}`

            trSalaries.append(nameSal, amountSal)
            todosLosElementos.push(trSalaries) 
         });

         //utility
         const trUtility = document.createElement('tr')
         const nameUtility = document.createElement('th')
         const amountUtility = document.createElement('th')
         nameUtility.textContent = 'Utilidad Global'
         amountUtility.textContent = `S/.${utilityArray}`
         trUtility.append(nameUtility, amountUtility)
         todosLosElementos.push(trUtility)


         //dividing
         dividingArray.forEach(e => {
            const trDiv = document.createElement('tr')
            const nombreDiv = e.nombre
            const montoDiv = e.monto
            const nameDiv = document.createElement('td')
            const amountDiv = document.createElement('td')
            nameDiv.textContent = `Dividendo ${nombreDiv}`
            amountDiv.textContent = `S/.${montoDiv}`

            trDiv.append(nameDiv, amountDiv)
            todosLosElementos.push(trDiv) 
            
         });
       });

       
        
          cajaGrande.append(...todosLosElementos);
        
         
      });
  }
  
  

  const btnGet = document.getElementById("getSummaries");

  btnGet.addEventListener("click", async (e) => {
    e.preventDefault();
  
    const inputMonth = document.getElementById("inputMonth");
  
    const date = inputMonth.value;
    const year = date.substring(0, 4);
    const month = date.substring(5, 7);
    const urlInsomnia = `${urlBase}/api/v1/summaries/summaryByMonth?year=${year}&month=${month}`;
    
    
    traer(urlInsomnia);
    
  });

  //traer('http://localhost:3000/api/v1/summaries')