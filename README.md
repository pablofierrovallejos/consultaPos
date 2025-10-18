# ConsultaPost

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.0.4.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.


Para compilar produccion:
ng build --configuration=production

#Para iniciar la app después de clonar
npm install

ng serve

......
Generar servicio Angular


ng serve	//Ejecutar angular

ng serve --port 4201	//ejecutar angular en un puerto determinado

---

# Build y Deploy de Producción

## Compilar para producción
ng build --configuration=production

## Construir imagen Docker (incrementar versión)
docker build -t servicio-ng-front-vtas:v14 .
docker tag servicio-ng-front-vtas:v14 96552333aa/servicio-ng-front-vtas:v14
docker push 96552333aa/servicio-ng-front-vtas:v14

## Ejecutar localmente para pruebas
docker run -d -p 8080:80 servicio-ng-front-vtas:v14

## Ejecutar en producción con red Docker
sudo docker run -d --name servicio-ng-front-vtas --network springcloud -p 8080:80 --restart always 96552333aa/servicio-ng-front-vtas:v14

## Nota: Asegurarse de que los microservices backend estén ejecutándose:
# - servicio-productos en puerto 8001 (con prefijo /api/)
# - ms-concentrador-energia en puerto 8002 (SIN prefijo /api/energia/)
#   Las rutas del microservicio de energía están en la raíz: /consultar-measures, /consultar-consumo-mes2, etc.


# Ejecutar en modo desarrollo (usa environment.ts)
ng serve

# Ejecutar en puerto específico
ng serve --port 4200

# Ejecutar con configuración específica
ng serve --configuration=development

sudo docker run -d --name servicio-ng-front-vtas --network springcloud -p 8080:80 --restart always 96552333aa/servicio-ng-front-vtas:v12




# 1. Compilar para producción
ng build --configuration=production

# 2. Construir nueva imagen Docker (v14 - Fix del proxy de energía)
docker build -t servicio-ng-front-vtas:v14 .
docker tag servicio-ng-front-vtas:v14 96552333aa/servicio-ng-front-vtas:v14
docker push 96552333aa/servicio-ng-front-vtas:v14

# 3. Asegurarse que los microservicios backend están corriendo Y en la red springcloud
docker ps | grep -E "servicio-productos|ms-concentrador-energia"
docker network inspect springcloud | grep -E "servicio-productos|ms-concentrador-energia"

# 4. Actualizar el frontend en producción
docker stop servicio-ng-front-vtas
docker rm servicio-ng-front-vtas
docker pull 96552333aa/servicio-ng-front-vtas:v14
sudo docker run -d --name servicio-ng-front-vtas --network springcloud -p 8080:80 --restart always 96552333aa/servicio-ng-front-vtas:v14

# 5. Probar el endpoint de energía
curl "http://localhost:8080/api/energia/consultar-consumo-mes2/Meas1/2025-10-01"
