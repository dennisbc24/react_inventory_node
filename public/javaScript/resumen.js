const url = "http://localhost:3000/api/v1/ventas/filter?desde='2023-05-01'&hasta='2023-05-10'";
const url2 = "http://localhost:3000/api/v1/ventas/filter?desde='2023-05-10'&hasta='2023-05-20'";
const url3 = "http://localhost:3000/api/v1/ventas/filter?desde='2023-05-20'&hasta='2023-05-30'";

// Realiza ambas solicitudes fetch y espera a que ambas se completen
Promise.all([fetch(url), fetch(url2),  fetch(url3)])
    .then(responses => {
        // Convierte ambas respuestas en datos JSON
        const [data1, data2, data3] = responses.map(response => response.json());
        return Promise.all([data1, data2, data3]);
    })
    .then(([data1, data2, data3]) => {
        // Ahora puedes acceder a los datos de ambas respuestas aquí
        console.log('Datos de la primera solicitud:', data1[0]);
        console.log('Datos de la segunda solicitud:', data2[0]);
        console.log('Datos de la segunda solicitud:', data3[0]);
    })
    .catch(e => {
        console.error('Hubo un error:', e);
    });
    