# Troubleshooting - Error 502 en Energía

## Error Observado
```
Request URL: http://35.209.63.29:8080/api/energia/consultar-consumo-mes/Meas1/25-10-18
Status Code: 502 Bad Gateway
```

## Causa del Error 502
Un error 502 Bad Gateway significa que Nginx puede procesar la petición pero no puede comunicarse con el microservicio backend. Las causas comunes son:

1. El contenedor `ms-concentrador-energia` no está corriendo
2. El contenedor no está en la red `springcloud`
3. El contenedor está corriendo en un puerto diferente al esperado (8002)
4. El nombre del contenedor es diferente al configurado en nginx

## Pasos de Diagnóstico

### 1. Verificar que el contenedor esté corriendo
```bash
# En el servidor de producción (35.209.63.29)
docker ps | grep energia
```

**Resultado esperado:**
```
CONTAINER ID   IMAGE                                          COMMAND                  CREATED        STATUS        PORTS                    NAMES
xxxxx          96552333aa/ms-concentrador-energia:v1         "java -jar ..."          X hours ago    Up X hours    0.0.0.0:8002->8002/tcp   ms-concentrador-energia
```

Si NO aparece, el contenedor no está corriendo.

### 2. Verificar que el contenedor esté en la red correcta
```bash
docker inspect ms-concentrador-energia | grep -A 10 Networks
```

**Resultado esperado:**
```json
"Networks": {
    "springcloud": {
        ...
    }
}
```

### 3. Verificar conectividad desde el frontend
```bash
# Desde dentro del contenedor del frontend, hacer ping al servicio de energía
docker exec servicio-ng-front-vtas ping ms-concentrador-energia -c 3
```

**Resultado esperado:**
```
PING ms-concentrador-energia (172.x.x.x): 56 data bytes
64 bytes from 172.x.x.x: seq=0 ttl=64 time=0.123 ms
```

### 4. Verificar que el puerto 8002 esté escuchando
```bash
# Ver logs del contenedor
docker logs ms-concentrador-energia --tail 50

# Debe mostrar algo como:
# Tomcat started on port(s): 8002 (http)
```

### 5. Verificar manualmente la conectividad HTTP
```bash
# Desde dentro del contenedor del frontend
docker exec servicio-ng-front-vtas wget -O- http://ms-concentrador-energia:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-01
```

## Soluciones

### Solución 1: El contenedor no está corriendo
```bash
# Iniciar el contenedor del microservicio de energía
sudo docker run -d \
  -e spring.datasource.url='jdbc:mysql://10.128.0.3:3306/db_springboot_cloud?serverTimezone=America/Santiago&allowPublicKeyRetrival=true' \
  -p 8002:8002 \
  --name ms-concentrador-energia \
  --network springcloud \
  --restart always \
  96552333aa/ms-concentrador-energia:v1
```

### Solución 2: El contenedor está corriendo pero NO está en la red springcloud
**Este es el problema más común del error 502**

```bash
# Verificar en qué red está el contenedor
docker inspect ms-concentrador-energia --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}'

# Si NO muestra "springcloud", conectarlo:
docker network connect springcloud ms-concentrador-energia

# Verificar de nuevo
docker network inspect springcloud | grep ms-concentrador-energia

# Reiniciar nginx para que detecte el cambio
docker restart servicio-ng-front-vtas
```

### Solución 3: Recrear el contenedor CON la red correcta
```bash
# Detener y eliminar el contenedor actual
docker stop ms-concentrador-energia
docker rm ms-concentrador-energia

# Volver a crear CON --network springcloud (ver Solución 1)
sudo docker run -d \
  -e spring.datasource.url='jdbc:mysql://10.128.0.3:3306/db_springboot_cloud?serverTimezone=America/Santiago&allowPublicKeyRetrival=true' \
  -p 8002:8002 \
  --name ms-concentrador-energia \
  --network springcloud \
  --restart always \
  96552333aa/ms-concentrador-energia:v1
```
```bash
# Ver qué contenedores están en la red springcloud
docker network inspect springcloud

# Debe mostrar:
# - servicio-ng-front-vtas
# - servicio-productos
# - ms-concentrador-energia
```

### Solución 4: Recrear la red si es necesario
```bash
# Solo si es absolutamente necesario
docker network rm springcloud
docker network create springcloud

# Luego recrear todos los contenedores con --network springcloud
```

## Comandos Completos para Deployment en Orden

### Paso 1: Crear la red (si no existe)
```bash
docker network create springcloud
```

### Paso 2: Deploy del Microservicio de Energía
```bash
sudo docker run -d \
  -e spring.datasource.url='jdbc:mysql://10.128.0.3:3306/db_springboot_cloud?serverTimezone=America/Santiago&allowPublicKeyRetrival=true' \
  -p 8002:8002 \
  --name ms-concentrador-energia \
  --network springcloud \
  --restart always \
  96552333aa/ms-concentrador-energia:v1
```

### Paso 3: Deploy del Microservicio de Productos
```bash
sudo docker run -d \
  --name servicio-productos \
  --network springcloud \
  -p 8001:8001 \
  --restart always \
  96552333aa/servicio-productos:latest
```

### Paso 4: Deploy del Frontend
```bash
sudo docker run -d \
  --name servicio-ng-front-vtas \
  --network springcloud \
  -p 8080:80 \
  --restart always \
  96552333aa/servicio-ng-front-vtas:v13
```

### Paso 5: Verificación Post-Deploy
```bash
# Verificar que todos están corriendo
docker ps | grep -E "servicio-productos|ms-concentrador-energia|servicio-ng-front-vtas"

# Verificar que todos están en la red springcloud
docker network inspect springcloud | grep Name

# Verificar logs de cada servicio
docker logs servicio-productos --tail 20
docker logs ms-concentrador-energia --tail 20
docker logs servicio-ng-front-vtas --tail 20
```

## Prueba Final

Desde el servidor, probar directamente:
```bash
# Probar el endpoint de energía directamente
curl http://localhost:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-01

# Probar a través del frontend/nginx
curl http://localhost:8080/api/energia/consultar-consumo-mes/Meas1/2025-10-01
```

## Comandos Rápidos de Troubleshooting

```bash
# Estado de todos los contenedores
docker ps -a | grep -E "servicio-productos|ms-concentrador-energia|servicio-ng-front-vtas"

# Logs en tiempo real
docker logs -f ms-concentrador-energia

# Reiniciar un contenedor
docker restart ms-concentrador-energia

# Ver configuración de red de un contenedor
docker inspect ms-concentrador-energia --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{end}}'

# Probar conectividad entre contenedores
docker exec servicio-ng-front-vtas ping ms-concentrador-energia -c 1
docker exec servicio-ng-front-vtas wget -qO- http://ms-concentrador-energia:8002/actuator/health
```

## Checklist Pre-Deploy

- [ ] Red Docker `springcloud` existe
- [ ] Base de datos MySQL está accesible desde los contenedores
- [ ] Puerto 8001 está disponible para servicio-productos
- [ ] Puerto 8002 está disponible para ms-concentrador-energia  
- [ ] Puerto 8080 está disponible para servicio-ng-front-vtas
- [ ] Imágenes Docker están actualizadas (`docker pull`)
- [ ] Variables de entorno configuradas correctamente

## Contacto de Emergencia

Si el problema persiste después de estos pasos:
1. Capturar logs completos: `docker logs ms-concentrador-energia > energia_logs.txt`
2. Capturar configuración de red: `docker network inspect springcloud > network_info.txt`
3. Verificar firewall/security groups en GCP para el puerto 8002
