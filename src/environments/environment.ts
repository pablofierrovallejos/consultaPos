// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  baseUrl: '/api',  // Usa proxy en desarrollo (localhost:4200/api → localhost:8001/api)
  ventasUrl: '/api', // Usa proxy en desarrollo
  boletasUrl: '/api', // Usa proxy en desarrollo (localhost:4200/api → localhost:5000/api)
  notificacionesWsUrl: 'ws://localhost:5001/ws/notificaciones' // WebSocket de notificaciones en desarrollo
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
