export const environment = {
  production: true,
  baseUrl: '/api',                // Backend principal (productos, energía, etc)
  ventasUrl: '/api/ventas',       // Microservicio de inserción de ventas en producción
  boletasUrl: '/api'              // Microservicio de boletas en producción (usa proxy NGINX para /api/emitir-boleta y /api/boleta(s)/*)
};
