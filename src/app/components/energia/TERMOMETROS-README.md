# 🌡️ Módulo de Termómetros - Documentación

## Descripción General

Este módulo permite integrar múltiples termómetros en la vista de energía, mostrando la temperatura de forma numérica junto a los medidores de potencia. El sistema está diseñado de manera modular para facilitar la adición de nuevos sensores de temperatura.

## Ubicación

Los termómetros se muestran en la sección de **Power en Tiempo Real**, después del nodo **T72** (PanelSolar Negocio).

## Estructura del Endpoint

El módulo espera un endpoint que devuelva el siguiente formato JSON:

```json
{
  "nroSensoresConfig": 1,
  "numSensorsDetected": 1,
  "timestamp": 14897425,
  "sensor1": {
    "error": false,
    "temperature": 28.94
  }
}
```

**IMPORTANTE**: Las peticiones van **directamente** a la IP del sensor (sin proxy). El servidor del sensor **DEBE tener CORS habilitado** para aceptar peticiones desde `http://localhost:4200` (desarrollo) y desde el dominio de producción.

## Cómo Agregar un Nuevo Termómetro

### 1. Configuración en TypeScript

Edita el archivo `energia.component.ts` y busca la propiedad `thermometers`. Agrega un nuevo objeto al arreglo:

```typescript
thermometers: ThermometerConfig[] = [
  {
    id: 'temp1',
    nombre: 'Temperatura',
    url: 'http://192.168.2.110/api/temperature',
    valor: null,
    error: false,
    ultimaActualizacion: 'N/A'
  },
  // NUEVO TERMÓMETRO:
  {
    id: 'temp2',
    nombre: 'Temperatura Exterior',
    url: 'http://192.168.2.111/api/temperature',  // URL directa al sensor
    valor: null,
    error: false,
    ultimaActualizacion: 'N/A'
  }
];
```

### 2. Parámetros de Configuración

- **id**: Identificador único del termómetro (string)
- **nombre**: Nombre descriptivo que se mostrará en la UI
- **url**: URL completa del endpoint del sensor (ej: `http://192.168.2.110/api/temperature`)
- **valor**: Temperatura actual (null al inicio, se actualiza automáticamente)
- **error**: Estado de error (false por defecto)
- **ultimaActualizacion**: Timestamp de última actualización

### 3. Configurar CORS en el Servidor del Sensor

**MUY IMPORTANTE**: El servidor del sensor debe permitir peticiones CORS. Ejemplo de headers necesarios:

```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Para producción, cambiar el origen a tu dominio real o usar `*` para permitir todos los orígenes (menos seguro).

### 4. Visualización Automática

El HTML ya está configurado para mostrar todos los termómetros automáticamente usando `*ngFor`. No necesitas modificar el HTML para agregar nuevos termómetros.

## Colores según Temperatura

El sistema cambia automáticamente el color del indicador según la temperatura:

| Temperatura | Clase CSS | Color | Descripción |
|------------|-----------|-------|-------------|
| < 15°C | `temp-cold` | Azul | Frío |
| 15-24°C | `temp-normal` | Verde | Normal |
| 25-29°C | `temp-warm` | Naranja | Cálido |
| ≥ 30°C | `temp-hot` | Rojo (pulsante) | Caliente |
| Error | `temp-error` | Gris | Sin datos |

## Funcionalidades

### Carga Automática
- Los termómetros se cargan automáticamente al iniciar el componente
- Se ejecuta en `ngOnInit()`

### Actualización Manual
- Usa el botón "🔄 Actualizar" para refrescar todos los datos (power + temperatura)
- También puedes llamar `refrescarTermometros()` desde el código

### Manejo de Errores
- Si el endpoint no responde, se muestra "Error" en el indicador
- El color cambia a gris automáticamente
- Los errores se registran en la consola para debugging

## Formato de Visualización

La temperatura se muestra con un decimal:
- **28.9°C** (formato numérico, no análogo)
- Tamaño de fuente grande para fácil lectura
- Círculo de color según el rango de temperatura

## Personalización de Estilos

Los estilos están en `energia.component.css`. Puedes personalizar:

```css
/* Cambiar tamaño del círculo */
.temperature-display {
  width: 140px;
  height: 140px;
}

/* Cambiar tamaño del texto */
.temperature-value {
  font-size: 2.2em;
}

/* Modificar rangos de color */
.temp-hot {
  border-color: #e74c3c;
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
}
```

## Ejemplo Completo: Agregar 3 Termómetros

```typescript
thermometers: ThermometerConfig[] = [
  {
    id: 'temp1',
    nombre: 'Temperatura Sala',
    url: 'http://192.168.2.110/api/temperature',
    valor: null,
    error: false,
    ultimaActualizacion: 'N/A'
  },
  {
    id: 'temp2',
    nombre: 'Temperatura Exterior',
    url: 'http://192.168.2.111/api/temperature',
    valor: null,
    error: false,
    ultimaActualizacion: 'N/A'
  },
  {
    id: 'temp3',
    nombre: 'Temperatura Bodega',
    url: 'http://192.168.2.112/api/temperature',
    valor: null,
    error: false,
    ultimaActualizacion: 'N/A'
  }
];
```

**Recuerda**: Cada servidor debe tener CORS configurado correctamente.

## Consideraciones Técnicas

### Peticiones Directas
- Las peticiones HTTP van **directamente** a la IP del sensor
- No pasan por ningún proxy de Angular
- El navegador debe poder acceder a la red donde están los sensores

### CORS (Muy Importante)
- ⚠️ **REQUERIDO**: El servidor del sensor DEBE tener CORS configurado
- Debe permitir el origen: `http://localhost:4200` (desarrollo)
- Para producción, configurar el dominio de tu aplicación
- Sin CORS configurado, el navegador bloqueará las peticiones

#### Ejemplo de configuración CORS en el servidor del sensor:

**Arduino/ESP32:**
```cpp
server.sendHeader("Access-Control-Allow-Origin", "*");
server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
```

**Node.js/Express:**
```javascript
app.use(cors({
  origin: 'http://localhost:4200'
}));
```

**Python/Flask:**
```python
from flask_cors import CORS
CORS(app, origins=['http://localhost:4200'])
```

### Performance
- Las llamadas HTTP se cancelan automáticamente cuando el componente se destruye (usando `takeUntil`)
- No hay polling automático por defecto

### Polling Opcional
Si deseas actualización automática cada X segundos:

```typescript
ngOnInit(): void {
  // ... código existente ...
  
  // Actualizar termómetros cada 30 segundos
  setInterval(() => {
    this.cargarTermometros();
  }, 30000);
}
```

## Troubleshooting

### El termómetro muestra "Error"
1. Verifica que el sensor esté accesible:
   ```bash
   curl http://192.168.2.110/api/temperature
   ```
2. **Verifica CORS**: Abre la consola del navegador (F12) y busca errores de CORS
3. Si ves error de CORS, configura los headers en el servidor del sensor
4. Verifica que estés en la misma red que el sensor
5. Comprueba que el formato JSON de respuesta sea correcto

### Error de CORS en la consola
```
Access to XMLHttpRequest at 'http://192.168.2.110/api/temperature' from origin 
'http://localhost:4200' has been blocked by CORS policy: No 
'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Solución**: Configura CORS en el servidor del sensor (ver sección "Configurar CORS en el Servidor del Sensor")

### La temperatura no se actualiza
1. Verifica que el formato del JSON sea correcto
2. Asegúrate que el campo `sensor1.temperature` existe y contiene un número
3. Revisa la consola del navegador para ver si hay errores
4. Verifica que la respuesta no esté en caché

### El diseño se ve mal
1. Limpia la caché del navegador (Ctrl+Shift+Del)
2. Verifica que los archivos CSS se hayan guardado correctamente
3. Comprueba que no haya conflictos con otros estilos
4. Recarga la página con Ctrl+F5 (recarga forzada)

## Referencias

- **Componente TypeScript**: `energia.component.ts`
- **Template HTML**: `energia.component.html`
- **Estilos CSS**: `energia.component.css`
- **Interfaces**: Ver interfaces `TemperatureSensor`, `TemperatureResponse`, `ThermometerConfig`

## Changelog

- **v1.1** (2025-12-27): Cambiado a peticiones directas sin proxy (requiere CORS en el servidor)
- **v1.0** (2025-12-27): Implementación inicial del módulo de termómetros modular
