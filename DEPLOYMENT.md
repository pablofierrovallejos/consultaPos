# Guía de Deployment - ConsultaPos

## Arquitectura del Sistema

El sistema ConsultaPos está compuesto por:

1. **Frontend Angular** (este proyecto) - Puerto 8080
2. **Microservicio de Productos** - Puerto 8001
3. **Microservicio de Energía** - Puerto 8002

Todos los servicios se comunican a través de una red Docker llamada `springcloud`.

## Pre-requisitos

1. Docker instalado
2. Red Docker `springcloud` creada:
   ```bash
   docker network create springcloud
   ```

3. Base de datos MySQL accesible en la IP configurada (ej: 10.128.0.3:3306)

## Paso 1: Desplegar Microservicios Backend

### Microservicio de Productos (Puerto 8001)
```bash
sudo docker run -d \
  --name servicio-productos \
  --network springcloud \
  -p 8001:8001 \
  --restart always \
  96552333aa/servicio-productos:latest
```

### Microservicio de Energía (Puerto 8002)
```bash
sudo docker run -d \
  -e spring.datasource.url='jdbc:mysql://10.128.0.3:3306/db_springboot_cloud?serverTimezone=America/Santiago&allowPublicKeyRetrival=true' \
  -p 8002:8002 \
  --name ms-concentrador-energia \
  --network springcloud \
  --restart always \
  96552333aa/ms-concentrador-energia:v1
```

## Paso 2: Build del Frontend

### Compilar para producción
```bash
cd /ruta/al/proyecto/consultaPos
ng build --configuration=production
```

### Construir imagen Docker
```bash
# Incrementar versión según cambios
docker build -t servicio-ng-front-vtas:v13 .
docker tag servicio-ng-front-vtas:v13 96552333aa/servicio-ng-front-vtas:v13
docker push 96552333aa/servicio-ng-front-vtas:v13
```

## Paso 3: Desplegar Frontend

```bash
sudo docker run -d \
  --name servicio-ng-front-vtas \
  --network springcloud \
  -p 8080:80 \
  --restart always \
  96552333aa/servicio-ng-front-vtas:v13
```

## Verificación del Deployment

### 1. Verificar que todos los contenedores están corriendo:
```bash
docker ps | grep -E "servicio-productos|ms-concentrador-energia|servicio-ng-front-vtas"
```

### 2. Verificar logs de cada servicio:
```bash
# Frontend
docker logs servicio-ng-front-vtas

# Backend Productos
docker logs servicio-productos

# Backend Energía
docker logs ms-concentrador-energia
```

### 3. Probar endpoints:
```bash
# Frontend
curl http://localhost:8080

# API Productos
curl http://localhost:8001/api/productos/listar-productos

# API Energía
curl http://localhost:8002/api/energia/consultar-consumo-mes/Meas1/2025-10-01
```

## Configuración de Proxy Reverso

El frontend usa Nginx como proxy reverso con las siguientes reglas:

- `/api/energia/*` → `http://ms-concentrador-energia:8002/api/energia/`
- `/api/*` → `http://servicio-productos:8001/api/`

**IMPORTANTE**: El orden de las reglas es crítico. La ruta más específica (`/api/energia/`) debe estar ANTES de la genérica (`/api/`).

## Actualizar un Servicio

### Frontend
```bash
# Detener y eliminar contenedor actual
docker stop servicio-ng-front-vtas
docker rm servicio-ng-front-vtas

# Desplegar nueva versión
docker pull 96552333aa/servicio-ng-front-vtas:v13
sudo docker run -d --name servicio-ng-front-vtas --network springcloud -p 8080:80 --restart always 96552333aa/servicio-ng-front-vtas:v13
```

### Backend
```bash
# Similar para cada microservicio backend
docker stop servicio-productos
docker rm servicio-productos
docker pull 96552333aa/servicio-productos:latest
sudo docker run -d --name servicio-productos --network springcloud -p 8001:8001 --restart always 96552333aa/servicio-productos:latest
```

## Desarrollo Local

### Configuración de Proxy para Desarrollo

El archivo `proxy.conf.json` configura el proxy para desarrollo:

```json
{
  "/api/energia/*": {
    "target": "http://localhost:8002"
  },
  "/api/*": {
    "target": "http://localhost:8001"
  }
}
```

### Ejecutar en modo desarrollo
```bash
npm install
ng serve
```

Esto iniciará el servidor en `http://localhost:4200` con hot-reload.

## Troubleshooting

### Error 404 en rutas de energía
- Verificar que `ms-concentrador-energia` está corriendo: `docker ps | grep ms-concentrador-energia`
- Verificar logs: `docker logs ms-concentrador-energia`
- Verificar conectividad: `docker exec servicio-ng-front-vtas ping ms-concentrador-energia`

### Error de conexión a base de datos
- Verificar que la IP de la base de datos es accesible desde el contenedor
- Verificar credenciales en variables de entorno
- Verificar que el puerto 3306 está abierto

### Cambios no se reflejan
- Asegurarse de haber ejecutado `ng build --configuration=production`
- Verificar que la imagen Docker se construyó correctamente
- Hacer pull de la nueva versión en producción
- Limpiar caché del navegador (Ctrl+Shift+R)

## Sistema de Autenticación

**Credenciales por defecto:**
- Usuario: `hp`
- Contraseña: `hp`

La sesión se mantiene por 30 días mediante cookies del navegador.

## Versiones

- **v13**: 
  - Sistema de autenticación con cookies
  - Proxy configurado para microservicio de energía
  - Fix de formato de fechas para stored procedures
  - Integración de módulo de gastos via iframe

- **v12**: Versión anterior sin autenticación

## Contacto

Para soporte o dudas sobre el deployment, contactar al equipo de desarrollo.
