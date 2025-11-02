# Implementación de Notificaciones WebSocket

## Descripción
Sistema de notificaciones en tiempo real para ventas usando WebSocket. Muestra una ventana flotante animada desde el pie de la página cuando se registra una nueva venta.

## Componentes Modificados

### 1. HomeComponent (TypeScript)

**Nuevas propiedades:**
```typescript
private socket: WebSocket | null = null;
showNotification: boolean = false;
notificationData: any = null;
private notificationTimeout: any = null;
```

**Nuevos métodos:**
- `conectarWebSocket()`: Establece conexión con el microservicio de notificaciones
- `desconectarWebSocket()`: Cierra la conexión WebSocket
- `mostrarNotificacion(data)`: Muestra la notificación flotante con animación
- `reproducirSonido()`: Reproduce sonido de campanita al aparecer notificación

**Ciclo de vida:**
- `ngOnInit()`: Conecta WebSocket cuando el usuario está autenticado
- `ngOnDestroy()`: Desconecta WebSocket al destruir el componente

### 2. HomeComponent (HTML)

**Notificación flotante:**
```html
<div class="notification-popup" [class.show]="showNotification" *ngIf="notificationData">
  <div class="notification-content">
    <div class="notification-icon">🔔</div>
    <div class="notification-body">
      <h3 class="notification-title">Ventas {{notificationData.hora}}</h3>
      <p class="notification-text">
        <strong>Total Transacciones:</strong> {{notificationData.totalTransacciones}}
      </p>
      <p class="notification-text">
        <strong>Monto Total:</strong> {{formatearMonto(notificationData.montoTotal)}}
      </p>
    </div>
    <button class="notification-close" (click)="showNotification = false">✕</button>
  </div>
</div>
```

### 3. HomeComponent (CSS)

**Animaciones implementadas:**
- `slideUpBounce`: Animación de entrada desde el pie de la página con efecto rebote
- `ringBell`: Animación de campanita (balanceo)
- `pulse`: Efecto de pulso en el borde de la notificación

**Características de diseño:**
- Gradiente morado/azul (consistente con el tema de la app)
- Sombra profunda para destacar sobre el contenido
- Botón de cierre manual
- Auto-cierre después de 3 segundos
- Responsive (adapta tamaño en móviles)

## Configuración del WebSocket

**URL del microservicio:**
```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = 'localhost:5001';
const url = `${protocol}//${host}/ws/notificaciones`;
```

**Formato de mensaje esperado:**
```json
{
  "tipo": "ventas",
  "total_transacciones": 1,
  "total_monto": 1000
}
```

## Comportamiento

1. **Al recibir mensaje:**
   - Reproduce sonido de campanita
   - Muestra notificación desde el pie de la página con animación
   - Recarga datos del dashboard (gráficos)
   - Auto-cierra después de 3 segundos

2. **Reconexión automática:**
   - Si se pierde la conexión, intenta reconectar cada 5 segundos
   - Solo si el usuario está autenticado

3. **Cierre manual:**
   - Botón ✕ en la esquina superior derecha
   - Al hacer clic, cierra inmediatamente la notificación

## Archivo de Sonido

**Ubicación:** `src/assets/notification-bell.mp3`

**Nota:** Actualmente se requiere agregar el archivo de audio manualmente. Se puede:
1. Descargar un sonido de campanita gratuito
2. Usar un generador de tonos online
3. Comentar la línea `audio.play()` si no se desea sonido

**Alternativa sin archivo:** El código ya maneja el error si no encuentra el archivo.

## Testing Local

1. **Iniciar microservicio de notificaciones:**
   ```bash
   # El microservicio debe estar corriendo en localhost:5001
   ```

2. **Abrir consola del navegador:**
   - Verás mensajes de conexión WebSocket
   - Mensajes recibidos se logean con emoji 📊

3. **Simular venta:**
   - El microservicio debe enviar mensajes tipo "ventas"
   - La notificación aparecerá automáticamente

## Ejemplo de Integración

Ver archivo: `src/assets/ejemplo-cliente.html` para un cliente WebSocket standalone de prueba.

## Formato de Datos

**Hora:** Formato es-CL (ejemplo: "5:45:15 p. m.")
**Monto:** Formato moneda chilena (ejemplo: "$1.000")

## Mejoras Futuras

- [ ] Agregar diferentes tipos de notificaciones (productos, gastos)
- [ ] Permitir configurar tiempo de auto-cierre
- [ ] Historial de notificaciones
- [ ] Filtros de notificaciones
- [ ] Sonidos diferentes por tipo de notificación
- [ ] Configuración de volumen del sonido
- [ ] Badge con contador de notificaciones no leídas
