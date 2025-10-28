# Módulo de Ingreso Manual de Ventas

## Descripción

Módulo desarrollado para permitir el ingreso manual de ventas a través de un formulario interactivo. El módulo está completamente desacoplado del componente principal (home) para mantener el código limpio y mantenible.

## Características

### 1. Formulario Reactivo con Validaciones
- Validaciones en tiempo real
- Campos requeridos marcados con asterisco (*)
- Mensajes de error contextuales
- Cálculos automáticos de totales

### 2. Gestión de Encabezado de Venta
- Fecha de venta
- Número de boleta
- Tipo de pago (Efectivo, Tarjeta, Transferencia)
- Datos opcionales de Transbank (solo para pagos con tarjeta)

### 3. Detalle de Productos
- Selección de productos desde catálogo
- Tabla dinámica de detalles
- Agregar/eliminar líneas de detalle
- Precio unitario automático
- Cálculo automático de subtotales

### 4. Cálculos Automáticos
- Total de artículos
- Subtotal de la venta
- IVA (19%)
- Total a pagar

### 5. Integración con API
- Inserción de encabezado de venta: `POST /api/productos/insertar-venta`
- Inserción de detalles: `POST /api/productos/insertar-detalleventa`

## Estructura de Archivos

```
src/app/
├── models/
│   └── venta.model.ts          # Modelos de datos (Venta, DetalleVenta, Producto)
├── service/
│   └── api.service.ts          # Métodos insertarVenta() e insertarDetalleVenta()
└── components/
    └── ingresoventa/
        ├── ingresoventa.component.ts    # Lógica del componente
        ├── ingresoventa.component.html  # Vista del formulario
        └── ingresoventa.component.css   # Estilos

```

## Modelos de Datos

### Venta (Encabezado)
```typescript
interface Venta {
  idventa?: number;           // Generado por el backend
  fechaventa: string;         // YYYY-MM-DD
  secuencia?: number;         // Opcional
  nroboleta?: string;         // Requerido
  totalarticulos: number;     // Calculado automáticamente
  subtotalventa: number;      // Calculado automáticamente
  iva: number;                // Calculado automáticamente (19%)
  totalimporte: number;       // Calculado automáticamente
  tipopago: string;           // EFECTIVO, TARJETA, TRANSFERENCIA
  comisiontbk?: number;       // Opcional (solo tarjeta)
  comunicacionpos?: string;   // Opcional (solo tarjeta)
  estadotransbank?: string;   // Opcional (solo tarjeta)
  trazastattransbk?: string;  // Opcional (solo tarjeta)
  longmsgtransbank?: string;  // Opcional (solo tarjeta)
}
```

### DetalleVenta
```typescript
interface DetalleVenta {
  idventa?: number;           // FK al encabezado
  nombreproducto: string;     // Nombre del producto
  idproducto: number;         // FK al producto
  cantidad: number;           // Cantidad vendida
  preciosubtotal: number;     // Calculado (cantidad * precio)
}
```

## Flujo de Datos

### 1. Carga Inicial
```
ngOnInit()
  ↓
cargarProductos()
  ↓
api.getProductos() → productos[]
  ↓
Formulario listo para uso
```

### 2. Selección de Producto
```
Usuario selecciona producto
  ↓
onProductoChange(index)
  ↓
Busca producto en catálogo
  ↓
Actualiza: nombreproducto, preciounitario
  ↓
calcularSubtotalDetalle(index)
  ↓
calcularTotales()
```

### 3. Guardar Venta
```
Usuario presiona "Guardar Venta"
  ↓
Validar formulario
  ↓
Preparar datos de venta
  ↓
api.insertarVenta(venta) → idventa
  ↓
Para cada detalle:
  api.insertarDetalleVenta(detalle)
  ↓
Mostrar mensaje de éxito
  ↓
Limpiar formulario
```

## Métodos Principales

### Componente (ingresoventa.component.ts)

#### inicializarFormulario()
Crea el FormGroup con validaciones y suscripciones.

#### cargarProductos()
Obtiene el catálogo de productos del backend.

#### agregarDetalle()
Agrega una nueva línea de detalle al FormArray.

#### eliminarDetalle(index)
Elimina una línea de detalle específica.

#### onProductoChange(index)
Evento cuando se selecciona un producto. Actualiza nombre y precio.

#### onCantidadChange(index)
Evento cuando cambia la cantidad. Recalcula subtotal.

#### calcularSubtotalDetalle(index)
Calcula el subtotal de una línea: cantidad × precio.

#### calcularTotales()
Calcula totales globales: total artículos, subtotal, IVA, total.

#### guardarVenta()
Valida y envía los datos al backend. Proceso asíncrono.

### Servicio API (api.service.ts)

#### insertarVenta(venta: any): Observable<any>
```typescript
POST /api/productos/insertar-venta
Body: {
  fechaventa: "2025-10-18",
  nroboleta: "001-0012345",
  totalarticulos: 3,
  subtotalventa: 15000,
  iva: 2850,
  totalimporte: 17850,
  tipopago: "EFECTIVO",
  ...
}
Response: { idventa: 123 }
```

#### insertarDetalleVenta(detalle: any): Observable<any>
```typescript
POST /api/productos/insertar-detalleventa
Body: {
  idventa: 123,
  nombreproducto: "Producto A",
  idproducto: 45,
  cantidad: 2,
  preciosubtotal: 10000
}
Response: { status: "OK" }
```

## Validaciones

### Campos Requeridos
- ✅ Fecha de venta
- ✅ Número de boleta
- ✅ Tipo de pago
- ✅ Producto (en cada línea de detalle)
- ✅ Cantidad > 0 (en cada línea de detalle)

### Validaciones de Negocio
- Al menos una línea de detalle
- Cantidad mínima: 1
- Precio unitario ≥ 0
- No se puede eliminar la última línea de detalle

## Estilos y UX

### Características de Diseño
- 🎨 Diseño moderno con gradientes
- 📱 Responsive (mobile-friendly)
- ✨ Animaciones sutiles
- 🎯 Indicadores visuales claros
- ⚡ Feedback inmediato

### Paleta de Colores
- Primario: #667eea → #764ba2 (gradiente)
- Éxito: #28a745
- Error: #dc3545
- Secundario: #6c757d

### Estados Visuales
- ✅ Éxito: Verde (#d4edda)
- ❌ Error: Rojo (#f8d7da)
- ⏳ Cargando: Botón deshabilitado con spinner
- 📝 Campo inválido: Borde rojo

## Uso

### Navegación
```typescript
// Desde el home component
iraventas() {
  this.router.navigate(['/ingresoventa']);
}
```

### Acceso Directo
```
http://localhost:4200/ingresoventa
```

### Botón en el Header
Ya está configurado en el toolbar del home:
```html
<button (click)="iraventas()"> Ventas </button>
```

## Ejemplo de Uso Completo

### 1. Usuario abre el formulario
- Se cargan los productos disponibles
- Fecha actual por defecto
- Tipo de pago: EFECTIVO por defecto

### 2. Usuario completa datos generales
```
Fecha: 2025-10-18
Nro. Boleta: 001-0012345
Tipo de Pago: EFECTIVO
```

### 3. Usuario agrega productos
```
Línea 1:
  Producto: Coca Cola 500ml
  Cantidad: 2
  Precio Unit: $1500
  Subtotal: $3000

Línea 2:
  Producto: Pan Hallulla
  Cantidad: 10
  Precio Unit: $800
  Subtotal: $8000
```

### 4. Sistema calcula totales automáticamente
```
Total Artículos: 12
Subtotal: $11000
IVA (19%): $2090
TOTAL: $13090
```

### 5. Usuario guarda la venta
- Validación OK ✅
- Se envía al backend
- Se muestra mensaje de éxito
- Formulario se limpia

## Troubleshooting

### Error: "No se obtuvo el ID de la venta"
**Causa:** El backend no retorna el `idventa` después de insertar.
**Solución:** Verificar que el endpoint `/api/productos/insertar-venta` retorne el ID en la respuesta.

### Error: "Error al cargar productos"
**Causa:** Servicio de productos no disponible.
**Solución:** Verificar que el microservicio esté corriendo y accesible.

### Productos no se muestran en el select
**Causa:** Estructura de datos incorrecta.
**Solución:** Verificar que el endpoint retorne un array con `idproducto`, `nombreproducto` y `preciounit`.

### Totales no se calculan
**Causa:** ValueChanges no está suscrito correctamente.
**Solución:** Verificar que `calcularTotales()` se llame en `onCantidadChange()`.

## Testing

### Comandos de Prueba

```bash
# Probar inserción de venta
curl -X POST "http://localhost:8001/api/productos/insertar-venta" \
  -H "Content-Type: application/json" \
  -d '{
    "fechaventa": "2025-10-18",
    "nroboleta": "001-TEST",
    "totalarticulos": 1,
    "subtotalventa": 1000,
    "iva": 190,
    "totalimporte": 1190,
    "tipopago": "EFECTIVO"
  }'

# Probar inserción de detalle
curl -X POST "http://localhost:8001/api/productos/insertar-detalleventa" \
  -H "Content-Type: application/json" \
  -d '{
    "idventa": 123,
    "nombreproducto": "Test",
    "idproducto": 1,
    "cantidad": 1,
    "preciosubtotal": 1000
  }'
```

## Próximas Mejoras

- [ ] Búsqueda de productos por código de barras
- [ ] Descuentos por línea
- [ ] Integración con impresora de boletas
- [ ] Historial de últimas ventas
- [ ] Validación de stock antes de guardar
- [ ] Autocompletado de productos
- [ ] Guardado como borrador
- [ ] Copia de última venta

## Dependencias

- Angular 16+
- ReactiveFormsModule (ya importado)
- ApiService
- Router
- CommonModule

## Changelog

### v1.0.0 (2025-10-18)
- ✅ Formulario reactivo completo
- ✅ Validaciones en tiempo real
- ✅ Cálculos automáticos
- ✅ Integración con API
- ✅ Diseño responsive
- ✅ Manejo de errores
- ✅ Código desacoplado

## Autor

Desarrollado para ConsultaPos - Sistema de Gestión de Ventas
