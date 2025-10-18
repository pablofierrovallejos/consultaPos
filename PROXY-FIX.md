# Fix del Proxy de Energía - v14

## Problema Identificado

El microservicio de energía (`ms-concentrador-energia:8002`) tiene las rutas en la **raíz** del servidor, sin el prefijo `/api/energia/`:

```
✅ CORRECTO (microservicio):
http://localhost:8002/consultar-measures/Meas1/2025-10-01
http://localhost:8002/consultar-consumo-mes2/Meas1/2025-10-01

❌ INCORRECTO (no existe):
http://localhost:8002/api/energia/consultar-measures/Meas1/2025-10-01
```

Sin embargo, el **frontend Angular** llama a las rutas con el prefijo `/api/energia/`:

```typescript
// En api.service.ts
private urlconsultaMeas = this.baseUrl + '/energia/consultar-estadistica/Meas1/';
```

## Solución Implementada

Se configuró un **rewrite** en Nginx para quitar el prefijo `/api/energia/` antes de enviar la petición al microservicio.

### Configuración de Nginx (`nginx.conf`)

**ANTES (v13 - NO FUNCIONABA):**
```nginx
location /api/energia/ {
  proxy_pass http://ms-concentrador-energia:8002/api/energia/;
  # Esto enviaba: http://ms-concentrador-energia:8002/api/energia/consultar-measures/...
  # ❌ El microservicio NO tiene /api/energia/ en sus rutas
}
```

**DESPUÉS (v14 - FUNCIONA):**
```nginx
location /api/energia/ {
  rewrite ^/api/energia/(.*)$ /$1 break;
  proxy_pass http://ms-concentrador-energia:8002;
  # Esto envía: http://ms-concentrador-energia:8002/consultar-measures/...
  # ✅ Quita /api/energia/ antes de enviar al microservicio
}
```

### Flujo de la Petición

```
1. Frontend hace:
   GET http://35.209.63.29:8080/api/energia/consultar-consumo-mes2/Meas1/2025-10-01

2. Nginx recibe y hace rewrite:
   /api/energia/consultar-consumo-mes2/Meas1/2025-10-01
   ↓ (rewrite quita /api/energia/)
   /consultar-consumo-mes2/Meas1/2025-10-01

3. Nginx envía al microservicio:
   GET http://ms-concentrador-energia:8002/consultar-consumo-mes2/Meas1/2025-10-01

4. Microservicio responde correctamente ✅
```

### Configuración de Desarrollo (`proxy.conf.json`)

También se actualizó para desarrollo local:

```json
{
  "/api/energia/*": {
    "target": "http://localhost:8002",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/api/energia": ""
    }
  }
}
```

El `pathRewrite` hace lo mismo que el `rewrite` de Nginx.

## Comandos de Prueba

### Prueba Directa al Microservicio (sin proxy)
```bash
# Esto siempre debió funcionar
curl "http://35.209.63.29:8002/consultar-consumo-mes2/Meas1/2025-10-01"
```

### Prueba a Través del Nginx (con proxy)
```bash
# Esto es lo que se corrigió con v14
curl "http://35.209.63.29:8080/api/energia/consultar-consumo-mes2/Meas1/2025-10-01"
```

## Deployment de v14

```bash
# 1. Build de producción
ng build --configuration=production

# 2. Crear imagen Docker v14
docker build -t servicio-ng-front-vtas:v14 .
docker tag servicio-ng-front-vtas:v14 96552333aa/servicio-ng-front-vtas:v14
docker push 96552333aa/servicio-ng-front-vtas:v14

# 3. En producción - Actualizar
docker stop servicio-ng-front-vtas
docker rm servicio-ng-front-vtas
docker pull 96552333aa/servicio-ng-front-vtas:v14
sudo docker run -d --name servicio-ng-front-vtas --network springcloud -p 8080:80 --restart always 96552333aa/servicio-ng-front-vtas:v14

# 4. Verificar que funciona
curl "http://localhost:8080/api/energia/consultar-consumo-mes2/Meas1/2025-10-01"
```

## Checklist Pre-Deployment

- [ ] Microservicio de energía está corriendo
- [ ] Microservicio está en la red `springcloud`
- [ ] Puerto 8002 está expuesto
- [ ] Se puede hacer curl directo: `curl http://localhost:8002/consultar-measures/Meas1/2025-10-01`
- [ ] Build de producción completado: `ng build --configuration=production`
- [ ] Imagen Docker v14 creada y pusheada
- [ ] Frontend actualizado en producción

## Verificación Post-Deployment

```bash
# En el servidor de producción:

# 1. Verificar que el contenedor está corriendo
docker ps | grep servicio-ng-front-vtas

# 2. Verificar la configuración de nginx
docker exec servicio-ng-front-vtas cat /etc/nginx/conf.d/default.conf | grep -A 5 "/api/energia/"

# 3. Probar el endpoint
curl "http://localhost:8080/api/energia/consultar-consumo-mes2/Meas1/2025-10-01"

# 4. Ver logs si hay problemas
docker logs servicio-ng-front-vtas --tail 50
docker logs ms-concentrador-energia --tail 50
```

## Diferencias entre Microservicios

### Microservicio de Productos (puerto 8001)
- ✅ Tiene el prefijo `/api/` en sus rutas
- Ejemplo: `http://servicio-productos:8001/api/productos/listar-productos`
- Nginx NO necesita rewrite

### Microservicio de Energía (puerto 8002)
- ⚠️ NO tiene prefijo `/api/energia/` en sus rutas
- Ejemplo: `http://ms-concentrador-energia:8002/consultar-measures/Meas1/2025-10-01`
- Nginx SÍ necesita rewrite para quitar `/api/energia/`

## Resumen de Cambios en v14

1. ✅ Corregido `nginx.conf` con rewrite para energía
2. ✅ Corregido `proxy.conf.json` con pathRewrite para desarrollo
3. ✅ Actualizado README.md con instrucciones de v14
4. ✅ Actualizado TESTING-ENERGIA.md con rutas correctas
5. ✅ Creado PROXY-FIX.md con explicación detallada

## Troubleshooting

### Si sigue fallando con 502:
```bash
# Verificar que el contenedor está en la red
docker network inspect springcloud | grep ms-concentrador-energia

# Si no está, conectarlo:
docker network connect springcloud ms-concentrador-energia
docker restart servicio-ng-front-vtas
```

### Si obtienes 404:
```bash
# Verificar la configuración de nginx dentro del contenedor
docker exec servicio-ng-front-vtas cat /etc/nginx/conf.d/default.conf

# Debe tener el rewrite:
# rewrite ^/api/energia/(.*)$ /$1 break;
```

### Ver logs de nginx en tiempo real:
```bash
docker exec servicio-ng-front-vtas tail -f /var/log/nginx/access.log
docker exec servicio-ng-front-vtas tail -f /var/log/nginx/error.log
```
