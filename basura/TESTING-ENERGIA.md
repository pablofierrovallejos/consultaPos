# Comandos de Prueba - Microservicio de Energía

## Información del Servicio en Producción
- **IP Servidor:** 35.209.63.29
- **Puerto Directo:** 8002
- **Puerto Frontend/Nginx:** 8080
- **Contenedor:** ms-concentrador-energia
- **Nodo:** Meas1

## Endpoints Disponibles

⚠️ **IMPORTANTE**: El microservicio tiene las rutas en la raíz (sin prefijo `/api/energia/`)

Rutas reales del microservicio:
- `/consultar-measures/{snodo}/{sfecha}`
- `/consultar-estadistica/{snodo}/{sfecha}`
- `/consultar-consumo-mes/{snodo}/{sfecha}`
- `/consultar-consumo-mes2/{snodo}/{sfecha}`

El frontend llama con `/api/energia/` y Nginx hace el rewrite.

### 1. Consultar Mediciones de Energía
**Endpoint Microservicio:** `GET /consultar-measures/{snodo}/{sfecha}`  
**Endpoint Frontend:** `GET /api/energia/consultar-measures/{snodo}/{sfecha}`

**Formato de fecha:** YYYY-MM-DD

```bash
# Prueba directa al microservicio (puerto 8002) - SIN /api/energia/
curl -X GET "http://35.209.63.29:8002/consultar-measures/Meas1/2025-10-18"

# Prueba a través del frontend/nginx (puerto 8080) - CON /api/energia/
curl -X GET "http://35.209.63.29:8080/api/energia/consultar-measures/Meas1/2025-10-18"

# Con pretty print JSON
curl -X GET "http://35.209.63.29:8002/consultar-measures/Meas1/2025-10-18" | jq .
```

### 2. Consultar Estadística de Energía
**Endpoint Microservicio:** `GET /consultar-estadistica/{snodo}/{sfecha}`  
**Endpoint Frontend:** `GET /api/energia/consultar-estadistica/{snodo}/{sfecha}`

```bash
# Prueba directa al microservicio
curl -X GET "http://35.209.63.29:8002/consultar-estadistica/Meas1/2025-10-18"

# Prueba a través del frontend/nginx
curl -X GET "http://35.209.63.29:8080/api/energia/consultar-estadistica/Meas1/2025-10-18"

# Con headers verbosos para debug
curl -v -X GET "http://35.209.63.29:8002/consultar-estadistica/Meas1/2025-10-18"
```

### 3. Consultar Consumo Mensual (Simple)
**Endpoint Microservicio:** `GET /consultar-consumo-mes/{snodo}/{sfecha}`  
**Endpoint Frontend:** `GET /api/energia/consultar-consumo-mes/{snodo}/{sfecha}`

```bash
# Prueba directa al microservicio
curl -X GET "http://35.209.63.29:8002/consultar-consumo-mes/Meas1/2025-10-01"

# Prueba a través del frontend/nginx
curl -X GET "http://35.209.63.29:8080/api/energia/consultar-consumo-mes/Meas1/2025-10-01"

# Mes anterior
curl -X GET "http://35.209.63.29:8002/consultar-consumo-mes/Meas1/2025-09-01"
```

### 4. Consultar Consumo Mensual Multi (Este es el que usa el frontend)
**Endpoint Microservicio:** `GET /consultar-consumo-mes2/{snodo}/{sfecha}`  
**Endpoint Frontend:** `GET /api/energia/consultar-consumo-mes2/{snodo}/{sfecha}`

Este endpoint retorna datos de múltiples medidores (Meas1 y Meas2).

```bash
# Prueba directa al microservicio (SIN /api/energia/)
curl -X GET "http://35.209.63.29:8002/consultar-consumo-mes2/Meas1/2025-10-01"

# Prueba a través del frontend/nginx (CON /api/energia/)
curl -X GET "http://35.209.63.29:8080/api/energia/consultar-consumo-mes2/Meas1/2025-10-01"

# Con headers para ver la respuesta completa
curl -i -X GET "http://35.209.63.29:8002/consultar-consumo-mes2/Meas1/2025-10-01"

# Formato esperado de respuesta:
# [
#   {
#     "name": "2025-10-01",
#     "series": [
#       {"name": "Meas1", "value": "123.45"},
#       {"name": "Meas2", "value": "67.89"}
#     ]
#   },
#   ...
# ]
```

## Pruebas de Diagnóstico

### Verificar que el microservicio está respondiendo
```bash
# Health check básico (si existe)
curl -X GET "http://35.209.63.29:8002/actuator/health"

# O simplemente verificar conectividad
curl -I "http://35.209.63.29:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-01"
```

### Verificar conectividad desde el frontend
```bash
# SSH al servidor de producción, luego:
docker exec servicio-ng-front-vtas wget -qO- http://ms-concentrador-energia:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-01

# O usando curl desde dentro del contenedor
docker exec servicio-ng-front-vtas curl http://ms-concentrador-energia:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-01
```

### Verificar logs del microservicio
```bash
# SSH al servidor de producción, luego:
docker logs ms-concentrador-energia --tail 50

# En tiempo real
docker logs -f ms-concentrador-energia

# Buscar errores específicos
docker logs ms-concentrador-energia 2>&1 | grep -i error
docker logs ms-concentrador-energia 2>&1 | grep -i exception
```

## Solución del Error 502

Si obtienes error 502 al probar a través de nginx (puerto 8080) pero funciona directamente (puerto 8002):

### Opción 1: Verificar que el contenedor esté en la red springcloud
```bash
# SSH al servidor
docker network inspect springcloud | grep ms-concentrador-energia

# Si NO aparece, reconectar:
docker network connect springcloud ms-concentrador-energia
```

### Opción 2: Recrear el contenedor con la red correcta
```bash
# Detener y eliminar
docker stop ms-concentrador-energia
docker rm ms-concentrador-energia

# Recrear CON la red springcloud
sudo docker run -d \
  -e spring.datasource.url='jdbc:mysql://10.128.0.3:3306/db_springboot_cloud?serverTimezone=America/Santiago&allowPublicKeyRetrival=true' \
  -p 8002:8002 \
  --name ms-concentrador-energia \
  --network springcloud \
  --restart always \
  96552333aa/ms-concentrador-energia:v1
```

### Opción 3: Verificar configuración de Nginx
```bash
# Desde el contenedor del frontend, verificar nginx.conf
docker exec servicio-ng-front-vtas cat /etc/nginx/conf.d/default.conf

# Debe contener:
# location /api/energia/ {
#   proxy_pass http://ms-concentrador-energia:8002/api/energia/;
#   ...
# }
```

## Ejemplos de Formato de Fecha

El microservicio acepta fechas en formato `YYYY-MM-DD`:

```bash
# Formato correcto
curl "http://35.209.63.29:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-18"  # ✅
curl "http://35.209.63.29:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-01"  # ✅

# Formato incorrecto (causará error)
curl "http://35.209.63.29:8002/api/energia/consultar-consumo-mes/Meas1/25-10-18"    # ❌
curl "http://35.209.63.29:8002/api/energia/consultar-consumo-mes/Meas1/2025-10"     # ❌
```

## Test Completo de Conectividad

```bash
#!/bin/bash
# test-energia.sh - Script de prueba completo

SERVER="35.209.63.29"
NODO="Meas1"
FECHA="2025-10-01"

echo "=== Pruebas de Microservicio de Energía ==="
echo ""

echo "1. Prueba directa al microservicio (puerto 8002):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  "http://$SERVER:8002/api/energia/consultar-consumo-mes/$NODO/$FECHA"

echo ""
echo "2. Prueba a través de nginx (puerto 8080):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  "http://$SERVER:8080/api/energia/consultar-consumo-mes/$NODO/$FECHA"

echo ""
echo "3. Prueba del endpoint multi:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  "http://$SERVER:8002/api/energia/consultar-consumo-mes2/$NODO/$FECHA"

echo ""
echo "4. Datos reales (primeros 5):"
curl -s "http://$SERVER:8002/api/energia/consultar-consumo-mes2/$NODO/$FECHA" | jq '.[0:5]'
```

## Notas Importantes

1. **Formato de fecha:** Siempre usar `YYYY-MM-DD` (ej: 2025-10-18)
2. **Nodo:** El frontend usa `Meas1` por defecto
3. **Puerto directo:** 8002 para acceso directo al microservicio
4. **Puerto nginx:** 8080 para acceso a través del proxy (frontend)
5. **Red Docker:** Todos los contenedores DEBEN estar en la red `springcloud`

## Comandos de Emergencia

```bash
# Ver todos los contenedores y sus redes
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar conectividad entre contenedores
docker exec servicio-ng-front-vtas ping ms-concentrador-energia -c 3

# Reiniciar el microservicio de energía
docker restart ms-concentrador-energia

# Ver configuración completa del contenedor
docker inspect ms-concentrador-energia
```
