# Troubleshooting: Error 502 en endpoints de energía y temperatura

## Problema
```
GET http://35.209.63.29:8080/api/energia/temperatura/ultimas/T110?limit=1 502 (Bad Gateway)
GET http://35.209.63.29:8080/api/energia/consultar-estadistica/T72/2025-12-28 502 (Bad Gateway)
```

## Causa
El error 502 Bad Gateway significa que nginx no puede conectarse al microservicio `ms-concentrador-energia:8002`.

## Diagnóstico

### 1. Verificar que el microservicio esté corriendo
```bash
# Listar todos los contenedores
docker ps -a

# Verificar específicamente ms-concentrador-energia
docker ps | grep ms-concentrador-energia
```

**Salida esperada:**
```
CONTAINER ID   IMAGE                          STATUS         PORTS                    NAMES
xxxxx          ms-concentrador-energia:vX     Up X minutes   0.0.0.0:8002->8002/tcp   ms-concentrador-energia
```

### 2. Verificar que esté en la red springcloud
```bash
# Ver contenedores en la red springcloud
docker network inspect springcloud | grep -A 5 ms-concentrador-energia
```

**Debe aparecer:**
```json
"ms-concentrador-energia": {
    "EndpointID": "...",
    "IPv4Address": "172.x.x.x/16"
}
```

### 3. Verificar logs del microservicio
```bash
# Ver logs recientes
docker logs --tail=50 ms-concentrador-energia

# Ver logs en tiempo real
docker logs -f ms-concentrador-energia
```

**Buscar errores como:**
- Errores de conexión a base de datos
- Puerto 8002 ya en uso
- Errores de inicio de Spring Boot

### 4. Probar conectividad desde el contenedor de frontend
```bash
# Entrar al contenedor de nginx
docker exec -it servicio-ng-front-vtas sh

# Probar resolución DNS
nslookup ms-concentrador-energia

# Probar conectividad (si curl está instalado)
curl http://ms-concentrador-energia:8002/health
# o
wget -O- http://ms-concentrador-energia:8002/health

# Salir del contenedor
exit
```

### 5. Probar endpoints directamente desde el host
```bash
# Si el puerto 8002 está expuesto
curl http://localhost:8002/health
curl http://localhost:8002/temperatura/ultimas/T110?limit=1
```

## Soluciones

### Solución 1: Microservicio no está corriendo
```bash
# Iniciar el microservicio (ajustar el comando según tu setup)
cd /ruta/al/ms-concentrador-energia

# Opción A: Docker Compose
docker-compose up -d ms-concentrador-energia

# Opción B: Docker run manual
docker run -d --name ms-concentrador-energia \
  --network springcloud \
  -p 8002:8002 \
  --restart always \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://mysql:3306/db_springboot_cloud" \
  -e SPRING_DATASOURCE_USERNAME="root" \
  -e SPRING_DATASOURCE_PASSWORD="tu_password" \
  ms-concentrador-energia:latest
```

### Solución 2: Microservicio no está en la red springcloud
```bash
# Detener el contenedor
docker stop ms-concentrador-energia
docker rm ms-concentrador-energia

# Iniciar con la red correcta
docker run -d --name ms-concentrador-energia \
  --network springcloud \
  -p 8002:8002 \
  --restart always \
  ms-concentrador-energia:latest
```

### Solución 3: Microservicio se reinicia constantemente
```bash
# Ver por qué se reinicia
docker logs ms-concentrador-energia

# Problemas comunes:
# 1. No puede conectarse a la BD
# 2. Puerto 8002 ya en uso
# 3. Falta variable de entorno

# Verificar variables de entorno
docker inspect ms-concentrador-energia | grep -A 20 Env
```

### Solución 4: Reiniciar todo el stack
```bash
# Reiniciar microservicio de energía
docker restart ms-concentrador-energia

# Esperar 10 segundos
sleep 10

# Reiniciar frontend
docker restart servicio-ng-front-vtas

# Verificar que ambos estén up
docker ps | grep -E "ms-concentrador-energia|servicio-ng-front-vtas"
```

## Verificación Final

### 1. Probar endpoint de salud
```bash
curl http://localhost:8080/api/energia/health
```

**Respuesta esperada:**
```json
{"status": "UP"}
```

### 2. Probar endpoint de temperatura
```bash
curl "http://localhost:8080/api/energia/temperatura/ultimas/T110?limit=1"
```

**Respuesta esperada:**
```json
[
  {
    "id": 123,
    "nombrenodo": "T110",
    "temperatura": 25.5,
    "fechahora": "2025-12-28T10:30:00",
    "device_ip": "192.168.2.110"
  }
]
```

### 3. Probar endpoint de energía
```bash
curl "http://localhost:8080/api/energia/consultar-estadistica/T163/2025-12-28"
```

## Checklist Completo

- [ ] Microservicio ms-concentrador-energia está corriendo
- [ ] Microservicio está en la red springcloud
- [ ] Microservicio responde en el puerto 8002
- [ ] Base de datos está accesible desde el microservicio
- [ ] Tabla `medicion_temperatura` existe
- [ ] Stored procedure `sp_insertarMedicionTemperatura` existe
- [ ] Hay datos en la tabla `medicion_temperatura`
- [ ] Frontend puede resolver `ms-concentrador-energia` (DNS)
- [ ] Nginx puede hacer proxy a `ms-concentrador-energia:8002`
- [ ] Los endpoints responden correctamente

## Comandos Útiles Rápidos

```bash
# Ver todo el estado
docker ps -a && docker network inspect springcloud | grep -A 3 ms-concentrador-energia

# Reiniciar y ver logs
docker restart ms-concentrador-energia && sleep 5 && docker logs --tail=30 ms-concentrador-energia

# Probar conectividad completa
curl http://localhost:8080/api/energia/health && \
curl "http://localhost:8080/api/energia/temperatura/ultimas/T110?limit=1" && \
curl "http://localhost:8080/api/energia/consultar-estadistica/T163/2025-12-28"
```
