# 🔌 Implementación WebSocket para Notificaciones en Tiempo Real

## 📋 Resumen
Se ha implementado WebSocket con STOMP para notificar al frontend automáticamente cuando hay cambios en las estadísticas de energía en la base de datos, **incluso cuando los cambios se hacen directamente en SQL** (triggers, stored procedures, etc).

## 🎯 Componentes Implementados

### 1. **Configuración WebSocket** 
   - `WebSocketConfig.java` - Configura STOMP sobre WebSocket
   - Endpoint: `ws://localhost:8080/ws-energia`
   - Topic: `/topic/estadistica/{nodo}` y `/topic/estadistica/all`

### 2. **Servicio de Notificaciones**
   - `WebSocketNotificationService.java` - Envía notificaciones push al frontend
   - Métodos:
     - `notificarNuevaMedicion()` - Notifica nuevas mediciones
     - `notificarCambioEstadistica()` - Notifica cambios en estadísticas

### 3. **Sistema de Cola de Notificaciones (NUEVO)**
   - `websocket_notifications` - Tabla que almacena notificaciones pendientes
   - `WebSocketNotification.java` - Entidad JPA para la tabla
   - `IWebSocketNotificationRepository.java` - Repositorio para consultas
   - `WebSocketNotificationProcessor.java` - Procesa notificaciones cada 1 segundo

### 4. **Triggers SQL Funcionales**
   - `trigger_websocket_notification.sql` - Triggers que REALMENTE funcionan
   - `trg_after_insert_medicionenergia_actual` - Detecta INSERT
   - `trg_after_update_medicionenergia_actual` - Detecta UPDATE
   - Insertan registros en `websocket_notifications` con `procesado=FALSE`

### 5. **Controlador Mejorado**
   - `MeasController.java` actualizado
   - Endpoint `/consultar-estadistica/{snodo}/{sfecha}` ahora envía notificaciones WebSocket

### 6. **Cliente HTML de Ejemplo**
   - `websocket-client-example.html` - Cliente web completo para probar WebSocket

## 🚀 Cómo Funciona - Sistema Real de Cola

### Flujo de Notificación Automática:

```
1. INSERT/UPDATE en tabla medicionenergia_actual (desde SQL, trigger, SP, etc)
   ↓
2. Trigger SQL: trg_after_insert/update_medicionenergia_actual
   ↓
3. Inserta registro en websocket_notifications (procesado=FALSE)
   ↓
4. WebSocketNotificationProcessor se ejecuta cada 1 segundo (@Scheduled)
   ↓
5. Lee registros WHERE procesado=FALSE
   ↓
6. WebSocketNotificationService.notificarNuevaMedicion()
   ↓
7. Frontend recibe notificación en /topic/estadistica/{nodo}
   ↓
8. Marca procesado=TRUE, fecha_procesado=NOW()
```

### Ventajas de Este Enfoque:

✅ **Funciona con cambios directos en SQL** - No requiere que JPA haga los cambios  
✅ **Desacoplado** - La BD no necesita llamar APIs HTTP  
✅ **Resiliente** - Si Java se cae, las notificaciones quedan pendientes para procesar después  
✅ **Auditable** - Historial completo de notificaciones enviadas  
✅ **Escalable** - Múltiples instancias pueden procesar la cola  
✅ **Limpieza automática** - Elimina registros procesados >24h cada hora

## 📡 Endpoints WebSocket

### Conexión
```
URL: ws://localhost:8080/ws-energia
Protocolo: STOMP over WebSocket
Fallback: SockJS (HTTP long-polling)
```

### Topics para Suscripción

1. **Topic específico por nodo:**
   ```
   /topic/estadistica/T26
   /topic/estadistica/T221
   ```

2. **Topic global (todas las notificaciones):**
   ```
   /topic/estadistica/all
   ```

## 💻 Ejemplo de Uso - Frontend JavaScript

### 1. Instalación de Dependencias (CDN)
```html
<script src="https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js"></script>
```

### 2. Conectar al WebSocket
```javascript
const socket = new SockJS('http://localhost:8080/ws-energia');
const stompClient = Stomp.over(socket);

stompClient.connect({}, function(frame) {
    console.log('Conectado: ' + frame);
    
    // Suscribirse a un nodo específico
    stompClient.subscribe('/topic/estadistica/T26', function(message) {
        const notification = JSON.parse(message.body);
        console.log('Nueva medición:', notification);
        // Actualizar UI con los datos recibidos
        updateUI(notification);
    });
    
    // O suscribirse a todas las notificaciones
    stompClient.subscribe('/topic/estadistica/all', function(message) {
        const notification = JSON.parse(message.body);
        console.log('Notificación global:', notification);
    });
});
```

### 3. Formato de Notificación Recibida
```json
{
  "tipo": "NUEVA_MEDICION",
  "nodo": "T26",
  "timestamp": 1702665600000,
  "data": {
    "nombrenodo": "T26",
    "idregistro": 12345,
    "volts": "220.5",
    "current": "5.2",
    "power": "1146.6",
    "energy": "15678.9",
    "fechameas": "2025-12-15T10:30:00"
  }
}
```

## 🧪 Prueba Rápida

### 1. Ejecutar el Script SQL
```bash
# Conectar a MySQL y ejecutar el script
mysql -u usuario -p nombre_bd < src/sp/trigger_websocket_notification.sql
```

Esto creará:
- Tabla `websocket_notifications`
- Trigger `trg_after_insert_medicionenergia_actual`
- Trigger `trg_after_update_medicionenergia_actual`

### 2. Compilar el Proyecto
```bash
mvn clean install
```

### 3. Ejecutar la Aplicación
```bash
mvn spring-boot:run
```

Verás en los logs:
```
WebSocketNotificationProcessor iniciado - procesando cada 1 segundo
```

### 4. Abrir el Cliente de Prueba
Abrir en el navegador:
```
file:///C:/proyectos_python/ms-concentrador-energia/websocket-client-example.html
```

### 5. Conectar y Suscribirse
1. Click en "Conectar WebSocket"
2. Ingresar el nodo (ej: T26)
3. Click en "Suscribirse a Nodo Específico"

### 6. Generar Datos de Prueba - VER NOTIFICACIÓN EN TIEMPO REAL
Ejecutar en MySQL:
```sql
-- Esto disparará el trigger SQL y enviará notificación WebSocket
UPDATE medicionenergia_actual 
SET volts = '221.5', 
    current = '5.8', 
    power = '1284.7',
    energy = '15789.2'
WHERE nombrenodo = 'T26';

-- Ver que se creó la notificación pendiente
SELECT * FROM websocket_notifications WHERE procesado = FALSE;

-- Esperar 1 segundo y verificar que se procesó
SELECT * FROM websocket_notifications ORDER BY id DESC LIMIT 1;
-- Debería mostrar procesado = TRUE
```

### 7. Monitorear Notificaciones
```sql
-- Ver notificaciones pendientes
SELECT COUNT(*) as pendientes 
FROM websocket_notifications 
WHERE procesado = FALSE;

-- Ver últimas 10 notificaciones procesadas
SELECT id, nombrenodo, accion, volts, power, 
       fecha_creacion, fecha_procesado
FROM websocket_notifications 
WHERE procesado = TRUE
ORDER BY fecha_procesado DESC 
LIMIT 10;

-- Ver tiempo de procesamiento promedio
SELECT 
    AVG(TIMESTAMPDIFF(SECOND, fecha_creacion, fecha_procesado)) as segundos_promedio
FROM websocket_notifications 
WHERE procesado = TRUE;
```

## 📱 Integración con Angular/React/Vue

### Angular Example
```typescript
import * as SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';

export class EnergyService {
  private stompClient: any;

  connect() {
    const socket = new SockJS('http://localhost:8080/ws-energia');
    this.stompClient = Stomp.over(socket);
    
    this.stompClient.connect({}, (frame) => {
      this.stompClient.subscribe('/topic/estadistica/T26', (message) => {
        const data = JSON.parse(message.body);
        // Actualizar componente
        this.updateComponent(data);
      });
    });
  }
}
```

### React Example
```javascript
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

function useWebSocket() {
  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws-energia');
    const client = Stomp.over(socket);
    
    client.connect({}, () => {
      client.subscribe('/topic/estadistica/T26', (message) => {
        const data = JSON.parse(message.body);
        setEnergyData(data);
      });
    });
    
    return () => client.disconnect();
  }, []);
}
```

## 🔧 Configuración Adicional

### Configurar CORS para Producción
En `WebSocketConfig.java`, cambiar:
```java
.setAllowedOriginPatterns("*")
```
Por:
```java
.setAllowedOrigins("https://tu-dominio.com", "https://app.tu-dominio.com")
```

### Variables de Entorno
Agregar en `application.properties`:
```properties
# WebSocket Configuration
websocket.allowed.origins=http://localhost:4200,https://tu-dominio.com
websocket.broker.relay.enabled=false
```

## 📊 Monitoreo y Debugging

### Ver Conexiones Activas
```java
// En WebSocketNotificationService, agregar:
@Autowired
private SimpUserRegistry userRegistry;

public int getActiveConnections() {
    return userRegistry.getUserCount();
}
```

### Logs
```properties
# En application.properties
logging.level.org.springframework.messaging=DEBUG
logging.level.org.springframework.web.socket=DEBUG
```

## 🔒 Seguridad

### Agregar Autenticación (Opcional)
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = 
                    MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = accessor.getFirstNativeHeader("Authorization");
                    // Validar token JWT aquí
                }
                return message;
            }
        });
    }
}
```

## 📝 Notas Importantes

1. **Rendimiento**: El EntityListener se ejecuta en cada UPDATE/INSERT, mantener la lógica ligera
2. **Escalabilidad**: Para múltiples instancias, considerar usar RabbitMQ o Redis como broker externo
3. **Compatibilidad**: SockJS proporciona fallback automático si WebSocket no está disponible
4. **Reconexión**: Implementar lógica de reconexión automática en el cliente

## 🐛 Troubleshooting

### WebSocket no conecta
- Verificar que el puerto 8080 esté abierto
- Revisar logs: `logging.level.org.springframework.web.socket=DEBUG`
- Verificar CORS en navegador

### Notificaciones no llegan
- Verificar que el EntityListener esté registrado en la entidad
- Comprobar que los triggers SQL estén creados
- Revisar logs del servicio de notificaciones

### Conexiones múltiples
- Asegurar que `disconnect()` se llame cuando el componente se desmonte
- Usar `useEffect` cleanup en React o `ngOnDestroy` en Angular

## 📚 Recursos

- [Spring WebSocket Documentation](https://docs.spring.io/spring-framework/reference/web/websocket.html)
- [STOMP Protocol](https://stomp.github.io/)
- [SockJS](https://github.com/sockjs/sockjs-client)

## ✅ Testing

### Test Manual
1. Ejecutar aplicación
2. Abrir `websocket-client-example.html`
3. Conectar y suscribirse
4. Ejecutar UPDATE en BD
5. Ver notificación en tiempo real

### Test Automático (Opcional)
Crear test de integración:
```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
public class WebSocketTest {
    @LocalServerPort
    private int port;
    
    @Test
    public void testWebSocketConnection() {
        // Test de conexión WebSocket
    }
}
```

---

## 🎉 Resultado

El endpoint `/api/energia/consultar-estadistica/T26/25-12-15` ahora:

✅ Retorna datos normalmente (HTTP)  
✅ Envía notificación push al frontend (WebSocket)  
✅ Se activa automáticamente cuando hay cambios en BD  
✅ Soporta múltiples clientes simultáneos  
✅ Tiene fallback a HTTP long-polling si WebSocket falla  

Los clientes frontend recibirán actualizaciones en tiempo real sin necesidad de hacer polling!
