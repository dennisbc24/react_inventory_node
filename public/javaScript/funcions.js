export const sendData = (urlApi, type, formDataParam) => {

    fetch(urlApi, {
      headers: {
        "Content-Type": "application/json", //esto fue para que el body no llegue vacio
      },
        method:type,
        
        body: formDataParam
    })
    
  };