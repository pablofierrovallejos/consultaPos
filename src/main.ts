import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

// Polyfills para WebSocket (sockjs-client y @stomp/stompjs)
(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined },
  version: '',
  nextTick: (fn: Function) => setTimeout(fn, 0)
};
(window as any).Buffer = (window as any).Buffer || {
  isBuffer: () => false
};

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
