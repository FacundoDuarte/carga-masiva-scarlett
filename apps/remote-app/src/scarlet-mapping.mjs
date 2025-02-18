export const handler = async (event, _context) => {
    // Procesa la información del CSV (o de la orden) contenida en event.
    // Aquí determinas, por ejemplo, si la orden está retrasada o no.
    console.log(JSON.stringify(event));
    const response = {
        orderData: event, // Procesa y estructura los datos según necesites.
        delayed: false, // Cambia a true si la orden está retrasada.
    };
    return response;
};
