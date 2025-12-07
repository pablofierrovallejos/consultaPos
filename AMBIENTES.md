# Guía de Ambientes - ConsultaPos

## 🔧 DESARROLLO (localhost)

### Iniciar:
```bash
ng serve
```

### Configuración:
- **Puerto:** `http://localhost:4200`
- **Archivo proxy:** `src/proxy.conf.json`
- **Redirige a:** IP producción `35.209.63.29:8001`

### Para usar backend LOCAL:
Editar `src/proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:8001"
  }
}
```

---

## 🚀 PRODUCCIÓN (Docker)

### Build y Deploy:
```bash
# 1. Compilar
ng build --configuration=production

# 2. Incrementar versión (ejemplo: v21)
docker build -t servicio-ng-front-vtas:v21 .
docker tag servicio-ng-front-vtas:v21 96552333aa/servicio-ng-front-vtas:v21
docker push 96552333aa/servicio-ng-front-vtas:v21

# 3. Desplegar
docker stop servicio-ng-front-vtas
docker rm servicio-ng-front-vtas
sudo docker run -d --name servicio-ng-front-vtas --network springcloud -p 8080:80 --restart always 96552333aa/servicio-ng-front-vtas:v21
```

### Configuración:
- **Puerto:** `http://35.209.63.29:8080`
- **Proxy:** `nginx.conf`
- **Microservicios:**
  - `servicio-productos` (puerto 8001)
  - `ms-concentrador-energia` (puerto 8002)
  - `ms-boletas` (puerto 5000)
  - `ms-notifica` (puerto 8080)

---

## 📋 Resumen

| Ambiente | Comando | Puerto | Proxy | Backend |
|----------|---------|--------|-------|---------|
| **DEV** | `ng serve` | 4200 | `src/proxy.conf.json` | Producción (por defecto) |
| **PROD** | `docker run...` | 8080 | `nginx.conf` | Red Docker `springcloud` |

---

## ⚠️ Problema Actual

En **DEV** estás viendo datos de **PRODUCCIÓN** porque `src/proxy.conf.json` apunta a `35.209.63.29:8001`.

**Solución:** Cambia el target a `localhost:8001` y levanta tu backend local.
