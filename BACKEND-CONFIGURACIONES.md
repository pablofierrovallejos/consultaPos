# Implementación Backend: Endpoint de Configuraciones

## Tabla de Base de Datos

Ejecutar el script SQL: `sp/crear_tabla_configuraciones.sql`

```sql
CREATE TABLE IF NOT EXISTS configuraciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(500),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuraciones (clave, valor, descripcion) 
VALUES ('valorkilowatt', '180', 'Valor en pesos chilenos del kilowatt/hora para calcular el costo de energía')
ON DUPLICATE KEY UPDATE valor = '180';
```

## Endpoint Requerido en el Backend

### GET /api/productos/configuracion/{clave}

**Descripción:** Obtiene el valor de una configuración por su clave

**URL:** `http://servicio-productos:8001/api/productos/configuracion/{clave}`

**Método:** GET

**Parámetros:**
- `clave` (String): La clave de la configuración a consultar (ejemplo: "valorkilowatt")

**Respuesta exitosa (200 OK):**
```json
{
  "id": 1,
  "clave": "valorkilowatt",
  "valor": "180",
  "descripcion": "Valor en pesos chilenos del kilowatt/hora para calcular el costo de energía",
  "fecha_creacion": "2025-10-31T10:00:00",
  "fecha_modificacion": "2025-10-31T10:00:00"
}
```

**Respuesta error (404 Not Found):**
```json
{
  "error": "Configuración no encontrada",
  "clave": "valorkilowatt"
}
```

## Ejemplo de Implementación en Spring Boot

```java
@RestController
@RequestMapping("/api/productos")
public class ConfiguracionController {

    @Autowired
    private ConfiguracionRepository configuracionRepository;

    @GetMapping("/configuracion/{clave}")
    public ResponseEntity<?> obtenerConfiguracion(@PathVariable String clave) {
        Optional<Configuracion> config = configuracionRepository.findByClave(clave);
        
        if (config.isPresent()) {
            return ResponseEntity.ok(config.get());
        } else {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Configuración no encontrada");
            error.put("clave", clave);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }
}
```

## Entidad JPA

```java
@Entity
@Table(name = "configuraciones")
public class Configuracion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(unique = true, nullable = false, length = 100)
    private String clave;
    
    @Column(nullable = false, length = 255)
    private String valor;
    
    @Column(length = 500)
    private String descripcion;
    
    @Column(name = "fecha_creacion")
    private Timestamp fechaCreacion;
    
    @Column(name = "fecha_modificacion")
    private Timestamp fechaModificacion;
    
    // Getters y Setters
}
```

## Repository

```java
public interface ConfiguracionRepository extends JpaRepository<Configuracion, Integer> {
    Optional<Configuracion> findByClave(String clave);
}
```

## Uso en el Frontend

El frontend Angular ya está configurado para consumir este endpoint:

```typescript
// Llamada en energia.component.ts
this.ApiService.obtenerConfiguracion('valorkilowatt').subscribe(
  (config: any) => {
    if (config && config.valor) {
      this.valorKilowatt = parseFloat(config.valor);
    }
  }
);
```

## Cálculo de Costos

- **Energía consumida en Watts** → Convertir a Kilowatts (dividir por 1000)
- **Costo = (Energía en kW) * valorkilowatt**
- Ejemplo: 125,430 W = 125.43 kW × $180 = $22,577

## Actualizar el Valor

Para cambiar el valor del kilowatt, ejecutar:

```sql
UPDATE configuraciones 
SET valor = '200' 
WHERE clave = 'valorkilowatt';
```

El frontend tomará el nuevo valor la próxima vez que se cargue la página de energía.
