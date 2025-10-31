# Backend - Endpoints necesarios para Boletas

## 1. Endpoint para guardar boleta en BD

**POST** `/api/boletas/guardar-boleta`

### Request Body:
```json
{
  "idventa": 123,
  "boletaUrl": "https://ejemplo.com/boleta.pdf",
  "fechaEmision": "2025-10-28T19:00:00Z",
  "monto": 15000,
  "numeroFolio": "F0001234"
}
```

### Response:
```json
{
  "success": true,
  "message": "Boleta guardada correctamente",
  "id": 1
}
```

### SQL Query:
```sql
INSERT INTO boletas_emitidas 
  (idventa, numero_folio, boleta_url, fecha_emision, monto, estado)
VALUES 
  (?, ?, ?, ?, ?, 'emitido');
```

---

## 2. Endpoint para obtener boleta de una venta

**GET** `/api/boletas/obtener-boleta/:idventa`

### Response:
```json
{
  "id": 1,
  "idventa": 123,
  "numero_folio": "F0001234",
  "boleta_url": "https://ejemplo.com/boleta.pdf",
  "fecha_emision": "2025-10-28T19:00:00Z",
  "monto": 15000,
  "estado": "emitido"
}
```

### SQL Query:
```sql
SELECT * FROM boletas_emitidas 
WHERE idventa = ? 
LIMIT 1;
```

---

## 3. Modificar endpoint de consulta de ventas

Actualizar el endpoint que devuelve las ventas diarias para incluir la información de boleta si existe:

**GET** `/api/productos/venta-dia/:fecha`

### Response modificado:
```json
[
  {
    "idventa": 123,
    "fechaventa": "2025-10-28",
    "totalimporte": 15000,
    "trazastattransbk": "OK",
    "boletaUrl": "https://ejemplo.com/boleta.pdf",  // NUEVO CAMPO
    "numeroFolio": "F0001234"                        // NUEVO CAMPO
  }
]
```

### SQL Query modificado:
```sql
SELECT 
  v.*,
  b.boleta_url as boletaUrl,
  b.numero_folio as numeroFolio
FROM venta v
LEFT JOIN boletas_emitidas b ON v.idcorrelativo = b.idventa
WHERE DATE(v.fechaventa) = ?;
```

---

## 4. Servicio externo de emisión (ya existe)

**POST** `http://localhost:5000/api/emitir-boleta`

### Request Body:
```json
{
  "monto": 15000,
  "descripcion": "Venta #123 - 2025-10-28"
}
```

### Response esperado:
```json
{
  "success": true,
  "url": "https://ejemplo.com/boleta.pdf",
  "folio": "F0001234",
  "fecha": "2025-10-28T19:00:00Z"
}
```

---

## Resumen de cambios necesarios:

1. ✅ Crear tabla `boletas_emitidas` (SQL incluido en `crear_tabla_boletas.sql`)
2. ✅ Crear endpoint POST `/api/boletas/guardar-boleta`
3. ✅ Crear endpoint GET `/api/boletas/obtener-boleta/:idventa` (opcional)
4. ✅ Modificar endpoint GET `/api/productos/venta-dia/:fecha` para incluir LEFT JOIN con boletas

---

## Ejemplo de implementación en Spring Boot:

### BoletaEntity.java
```java
@Entity
@Table(name = "boletas_emitidas")
public class BoletaEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "idventa")
    private Integer idventa;
    
    @Column(name = "numero_folio")
    private String numeroFolio;
    
    @Column(name = "boleta_url")
    private String boletaUrl;
    
    @Column(name = "fecha_emision")
    private LocalDateTime fechaEmision;
    
    @Column(name = "monto")
    private BigDecimal monto;
    
    @Column(name = "estado")
    private String estado;
    
    // Getters y Setters
}
```

### BoletaController.java
```java
@RestController
@RequestMapping("/api/boletas")
public class BoletaController {
    
    @Autowired
    private BoletaRepository boletaRepository;
    
    @PostMapping("/guardar-boleta")
    public ResponseEntity<?> guardarBoleta(@RequestBody BoletaDTO boletaDTO) {
        BoletaEntity boleta = new BoletaEntity();
        boleta.setIdventa(boletaDTO.getIdventa());
        boleta.setNumeroFolio(boletaDTO.getNumeroFolio());
        boleta.setBoletaUrl(boletaDTO.getBoletaUrl());
        boleta.setFechaEmision(LocalDateTime.now());
        boleta.setMonto(boletaDTO.getMonto());
        boleta.setEstado("emitido");
        
        BoletaEntity saved = boletaRepository.save(boleta);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Boleta guardada correctamente");
        response.put("id", saved.getId());
        
        return ResponseEntity.ok(response);
    }
}
```
