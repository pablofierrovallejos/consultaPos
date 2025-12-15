import { Component, OnDestroy } from '@angular/core';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-energia',
  templateUrl: './energia.component.html',
  styleUrls: ['./energia.component.css', './energia-gauge-styles.css']
})
export class EnergiaComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private isLoadingPower = false; // Bandera para evitar llamadas simultáneas
  
  ChangedFormat='';
  ChangedFormatDisplay=''; // Formato DD-MM-YY para mostrar en headers
  datameas: any[] = [];
  datameasMes: any[] = [];
  datamultiMeas: any[] = [];
  totalEnergiaMes: number = 0; // Total de energía consumida en el mes
  totalEnergiaDia: number = 0; // Total de energía consumida en el día
  valorKilowatt: number = 284; // Valor por defecto del kilowatt
  costoDia: number = 0; // Costo total del día en pesos
  costoMes: number = 0; // Costo total del mes en pesos

  changed: Date = new Date();
  nombreMesActual = '';

  changedFecha: Date = new Date();

  // Nuevos nodos y datos de power
  nodos: string[] = ['T163', 'T221', 'T77', 'T26'];
  nodoSeleccionado: string = 'T163'; // Nodo por defecto
  powerData: { [key: string]: number } = {}; // Power actual de cada nodo (última medición)
  fechameasData: { [key: string]: string } = {}; // Fecha/hora de la última medición de cada nodo
  maxPower: number = 3500; // Rango máximo de power en watts
  dataPorNodo: { [key: string]: any[] } = {}; // Guardar datos de cada nodo
  
  // Descripciones de los nodos
  nodosDescripcion: { [key: string]: string } = {
    'T163': 'Cons. Negocio',
    'T221': 'PanelSolar Fondo',
    'T77': 'Cons. CasaFondo',
    'T26': 'Cons. CasaCentro'
  };

  pipe = new DatePipe('en-US');
  newDate: string= "";



  constructor(private ApiService: ApiService, private router: Router) {
  }

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ChangedFormatDisplay = this.pipe.transform(this.changed, 'dd-MM-yy') ?? ''; // Formato para mostrar
    this.newDate = this.pipe.transform(this.changed, 'dd/MM/yyyy') ?? '';

    // Obtener nombre del mes actual
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.nombreMesActual = meses[this.changed.getMonth()];

    // Obtener valor del kilowatt desde la configuración y LUEGO cargar datos
    this.cargarValorKilowatt();

    // Registrar auditoría de consulta del módulo energía
    this.registrarAuditoriaConsultaEnergia();

    console.log("ngOnInit(): " + this.ChangedFormat);
  }

  // Método para registrar auditoría de consulta del módulo energía
  async registrarAuditoriaConsultaEnergia(): Promise<void> {
    try {
      // Obtener geolocalización
      const geoData = await this.obtenerGeolocalizacion();

      // Preparar datos de auditoría
      const auditoria = {
        hostorigen: geoData.query || 'localhost',
        modulo: '/energia',
        accionrealizada: 'Consulta Energía',
        usuario: 'hp', // Usuario por defecto (podrías obtenerlo del servicio de auth si existe)
        detalles: `Acceso al módulo de energía | Precisión: ${geoData.precision} | ISP: ${geoData.isp} | Ciudad: ${geoData.city}`,
        dataprocesada: JSON.stringify({
          fecha_acceso: new Date().toISOString(),
          url: window.location.href,
          fecha_consulta: this.ChangedFormat,
          mes_consulta: this.nombreMesActual,
          geolocalizacion: {
            precision: geoData.precision,
            accuracy: geoData.accuracy,
            address: geoData.address,
            road: geoData.road,
            neighbourhood: geoData.neighbourhood,
            postcode: geoData.postcode,
            isp: geoData.isp,
            timezone: geoData.timezone,
            userAgent: geoData.userAgent,
            platform: geoData.platform,
            timestamp: geoData.timestamp
          }
        }),
        latitud: geoData.lat || 0,
        longitud: geoData.lon || 0,
        ciudad: geoData.city || 'Desconocida',
        region: geoData.regionName || 'Desconocida',
        pais: geoData.country || 'Chile'
      };

      // Registrar auditoría de forma asíncrona (no bloquear la carga)
      this.ApiService.registrarAuditoria(auditoria).subscribe(
        () => {
          console.log('✅ Auditoría de consulta energía registrada');
        },
        (error) => {
          console.warn('⚠️ No se pudo registrar auditoría de consulta energía:', error);
        }
      );

    } catch (error) {
      console.error('❌ Error al registrar auditoría de consulta energía:', error);
    }
  }

  // Método para obtener geolocalización: GPS primero, fallback a IP si usuario rechaza
  async obtenerGeolocalizacion(): Promise<any> {
    let geoData: any = {
      query: 'localhost',
      lat: -33.4489,
      lon: -70.6693,
      city: 'Desconocida',
      regionName: 'Desconocida',
      country: 'Chile',
      isp: 'Desconocido',
      timezone: 'America/Santiago',
      precision: 'low'
    };

    try {
      // 1. INTENTAR GPS PRIMERO (si usuario acepta)
      const posicion = await this.obtenerPosicionGPS();
      if (posicion) {
        geoData.lat = posicion.latitude;
        geoData.lon = posicion.longitude;
        geoData.accuracy = posicion.accuracy;
        geoData.precision = posicion.accuracy < 100 ? 'high' : 'medium';
        console.log('✅ Geolocalización GPS obtenida (usuario aceptó):', posicion);

        // Hacer reverse geocoding para obtener dirección exacta
        try {
          const locationData = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${posicion.latitude}&lon=${posicion.longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'ConsultaPos/1.0'
              }
            }
          );
          const reverseGeo = await locationData.json();
          
          if (reverseGeo && reverseGeo.address) {
            geoData.city = reverseGeo.address.city || reverseGeo.address.town || reverseGeo.address.municipality || 'Desconocida';
            geoData.regionName = reverseGeo.address.state || reverseGeo.address.region || 'Desconocida';
            geoData.country = reverseGeo.address.country || 'Chile';
            geoData.address = reverseGeo.display_name;
            geoData.postcode = reverseGeo.address.postcode;
            geoData.road = reverseGeo.address.road;
            geoData.neighbourhood = reverseGeo.address.neighbourhood;
            console.log('✅ Dirección exacta obtenida:', reverseGeo.address);
          }
        } catch (geoError) {
          console.warn('⚠️ No se pudo obtener dirección exacta:', geoError);
        }
      } else {
        console.log('⚠️ GPS no disponible (usuario rechazó o no soportado), usando fallback IP...');
      }

      // 2. OBTENER INFORMACIÓN DE IP (siempre, para complementar o como fallback)
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        
        if (ipData && !ipData.error) {
          geoData.query = ipData.ip;
          geoData.isp = ipData.org || ipData.isp || 'Desconocido';
          geoData.timezone = ipData.timezone || 'America/Santiago';
          geoData.asn = ipData.asn;
          
          // Si NO se obtuvo GPS, usar datos de IP como principal
          if (geoData.precision === 'low') {
            geoData.lat = ipData.latitude;
            geoData.lon = ipData.longitude;
            geoData.city = ipData.city;
            geoData.regionName = ipData.region;
            geoData.country = ipData.country_name;
            geoData.accuracy = 5000; // ~5km de precisión con IP
            geoData.precision = 'ip-fallback';
            console.log('📍 Usando geolocalización por IP (fallback):', ipData);
          } else {
            console.log('✅ Información de ISP/IP complementaria obtenida');
          }
        }
      } catch (ipError) {
        console.warn('⚠️ No se pudo obtener información de IP desde ipapi.co:', ipError);
        
        // Fallback final: solo obtener la IP
        try {
          const ipifyResponse = await fetch('https://api.ipify.org?format=json');
          const ipifyData = await ipifyResponse.json();
          geoData.query = ipifyData.ip;
          console.log('✅ IP obtenida desde ipify (fallback final):', ipifyData.ip);
        } catch (e) {
          console.warn('⚠️ No se pudo obtener IP pública');
        }
      }

      // 3. Agregar timestamp y metadata adicional
      geoData.timestamp = new Date().toISOString();
      geoData.userAgent = navigator.userAgent;
      geoData.platform = navigator.platform;
      geoData.language = navigator.language;
      
      console.log('📍 Geolocalización completa (método:', geoData.precision + '):', geoData);
      return geoData;

    } catch (error) {
      console.error('❌ Error general al obtener geolocalización:', error);
      return geoData; // Retornar datos por defecto
    }
  }

  // Método auxiliar para obtener posición GPS del navegador (silencioso, sin toasts molestos)
  private obtenerPosicionGPS(): Promise<any> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('⚠️ Geolocalización no soportada por el navegador');
        resolve(null);
        return;
      }

      console.log('📍 Solicitando permiso de geolocalización al usuario...');

      const timeoutId = setTimeout(() => {
        console.log('⚠️ Timeout al obtener geolocalización GPS, usando fallback IP');
        resolve(null);
      }, 10000); // 10 segundos de timeout

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          console.log('✅ Usuario ACEPTÓ geolocalización - Precisión:', Math.round(position.coords.accuracy) + 'm');
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              console.log('⚠️ Usuario RECHAZÓ geolocalización - usando fallback IP');
              break;
            case error.POSITION_UNAVAILABLE:
              console.log('⚠️ Posición GPS no disponible - usando fallback IP');
              break;
            case error.TIMEOUT:
              console.log('⚠️ Timeout GPS - usando fallback IP');
              break;
          }
          
          // Retornar null silenciosamente para usar fallback IP
          resolve(null);
        },
        {
          enableHighAccuracy: true, // Usar GPS si está disponible
          timeout: 10000,
          maximumAge: 0 // No usar caché
        }
      );
    });
  }

     //Para el grafico de tortas
     view: any = undefined; // undefined hace que los gráficos sean responsive
     gradient: boolean = false;
     showLegend: boolean = false;
     showLabels: boolean = true;
     isDoughnut: boolean = true;
     legendPosition: string = 'below';
     label: string = "Total ventas mes en pesos";
     animations: boolean = false; // DESHABILITADO para evitar memory leaks
     colorScheme: Color = {
      name: 'myScheme',
      selectable: true,
      group: ScaleType.Linear,
      domain: ['#3371FF', '#3371FF', '#3371FF'],
    };

    yAxisLabelMeas='Potencia Watts';
    xAxisLabelMeas='Hora';
    colorSchemeMeas: Color = {
      name: 'myScheme',
      selectable: true,
      group: ScaleType.Linear,
      domain: ['#FF0C00', '#FF0C00', '#FF0C00'],
    };

    showXAxis = true;
    showYAxis = true;
    showXAxisLabel = true;
    showYAxisLabel = true;


         // options
  showXAxis2: boolean = true;
  showYAxis2: boolean = true;
  gradient2: boolean = true;
  showLegend2: boolean = true;
  showXAxisLabel2: boolean = true;
  xAxisLabel2: string = 'Fecha';
  showYAxisLabel2: boolean = true;
  yAxisLabel2: string = 'Energía Kw/Mes';
  legendTitle2: string = 'Meas1: Consu - Meas2: Gen';

  colorScheme3: Color = {
    name: 'myScheme',
    selectable: true,
    group: ScaleType.Linear,
    domain: ['#FF0C00', '#00FF00', '#AAAAAA'],
  };


    onSelect(data): void {
      console.log('Item clicked', JSON.parse(JSON.stringify(data)));
    }

    onActivate(data): void {
      console.log('Activate', JSON.parse(JSON.stringify(data)));
    }

    onDeactivate(data): void {
      console.log('Deactivate', JSON.parse(JSON.stringify(data)));
    }


  // Método para cargar el valor del kilowatt desde la configuración
  cargarValorKilowatt(): void {
    // TODO: Descomentar cuando se implemente el endpoint en el backend
    /*
    this.ApiService.obtenerConfiguracion('valorkilowatt').subscribe(
      (config: any) => {
        if (config && config.valor) {
          this.valorKilowatt = parseFloat(config.valor);
          console.log('Valor kilowatt cargado desde BD:', this.valorKilowatt);
        } else {
          console.warn('No se encontró configuración, usando valor por defecto:', this.valorKilowatt);
        }
        // Cargar los datos DESPUÉS de obtener el valor del kilowatt
        this.llenarDataConsultaMeas(this.ChangedFormat);
        this.llenarDataConsultaMeasMes(this.ChangedFormat);
        this.llenarDataMeasMulti(this.ChangedFormat);
      },
      error => {
        console.error('Error al cargar valor kilowatt, usando valor por defecto:', error);
        // Incluso en caso de error, cargar los datos con el valor por defecto
        this.llenarDataConsultaMeas(this.ChangedFormat);
        this.llenarDataConsultaMeasMes(this.ChangedFormat);
        this.llenarDataMeasMulti(this.ChangedFormat);
      }
    );
    */
    
    // Usar valor por defecto (236) hasta que se implemente el backend
    console.log('Usando valor kilowatt por defecto:', this.valorKilowatt);
    
    // Cargar datos del nodo seleccionado
    this.llenarDataConsultaMeas(this.nodoSeleccionado, this.ChangedFormat);
    this.llenarDataConsultaMeasMes(this.nodoSeleccionado, this.ChangedFormat);
    this.llenarDataMeasMulti(this.nodoSeleccionado, this.ChangedFormat);
    
    // Cargar power (última medición) de todos los nodos
    this.cargarPowerTodosNodos();
  }

  // Método para cargar el último valor de power de todos los nodos
  cargarPowerTodosNodos(): void {
    // Evitar llamadas simultáneas
    if (this.isLoadingPower) {
      console.log('⏸️ Ya hay una carga de power en progreso, saltando...');
      return;
    }
    
    this.isLoadingPower = true;
    console.log('🔄 Cargando power de todos los nodos...');
    
    let completados = 0;
    const total = this.nodos.length;
    
    this.nodos.forEach(nodo => {
      // Usar getPowerNodo que solo trae el último registro (más eficiente)
      this.ApiService.getPowerNodo(nodo)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (datameas: any) => {
            console.log(`📊 Respuesta getPowerNodo para ${nodo}:`, datameas);
            
            // datameas ya es el último registro
            this.powerData[nodo] = this.extraerPowerDeRegistro(datameas);
            this.fechameasData[nodo] = this.extraerFechameasDeRegistro(datameas);
            
            console.log(`✅ ${nodo}: ${this.powerData[nodo]}W, ${this.fechameasData[nodo]}`);
            
            completados++;
            if (completados === total) {
              this.isLoadingPower = false;
              console.log('✅ Carga de power completada para todos los nodos');
            }
          },
          error: (error) => {
            console.error(`❌ Error cargando power de ${nodo}:`, error);
            this.powerData[nodo] = 0;
            this.fechameasData[nodo] = 'Error';
            
            completados++;
            if (completados === total) {
              this.isLoadingPower = false;
              console.log('⚠️ Carga de power completada con errores');
            }
          }
        });
    });
  }

  // Método auxiliar para extraer el valor de power de un registro
  private extraerPowerDeRegistro(registro: any): number {
    // Intentar obtener power de diferentes campos posibles
    if (registro.power !== undefined && registro.power !== null) {
      return parseFloat(registro.power) || 0;
    }
    if (registro.value !== undefined && registro.value !== null) {
      return parseFloat(registro.value) || 0;
    }
    if (registro.watts !== undefined && registro.watts !== null) {
      return parseFloat(registro.watts) || 0;
    }
    return 0;
  }

  // Método auxiliar para extraer y formatear fechameas de un registro
  private extraerFechameasDeRegistro(registro: any): string {
    if (registro.fechameas) {
      // fechameas viene como "2025-12-11T14:30:45" o similar
      const fecha = new Date(registro.fechameas);
      // Formatear solo la hora HH:MM:SS
      return this.pipe.transform(fecha, 'HH:mm:ss') || 'N/A';
    }
    return 'N/A';
  }

  // Método para cambiar de nodo
  cambiarNodo(nodo: string): void {
    this.nodoSeleccionado = nodo;
    this.llenarDataConsultaMeas(nodo, this.ChangedFormat);
    this.llenarDataConsultaMeasMes(nodo, this.ChangedFormat);
    this.llenarDataMeasMulti(nodo, this.ChangedFormat);
  }

  // Método para refrescar los valores de power (llamar cada X segundos)
  refrescarPowerNodos(): void {
    this.cargarPowerTodosNodos();
  }

  // Helper method para validar y limpiar datos de gráficos
  private validateChartData(data: any[], fallbackValue: any = 0): any[] {
    if (!data || !Array.isArray(data)) {
      console.warn('Datos de gráfico inválidos, usando array vacío:', data);
      return [];
    }

    return data.map((item, index) => {
      // Crear el objeto resultado con la estructura correcta para ngx-charts
      const result: any = {};

      // Manejar el campo name: usar 'namedia' si existe, sino 'name'
      let nameValue = '';
      if (item.namedia) {
        nameValue = item.namedia;
      } else if (item.name) {
        nameValue = item.name;
      } else {
        nameValue = 'Sin nombre';
      }

      // Intentar formatear como fecha DD-MM-YY si parece una fecha
      result.name = this.formatearFechaEjeX(nameValue);

      // Manejar el campo value: convertir string a number si es necesario
      if (item.value != null) {
        // Convertir string a number si es necesario
        const numValue = typeof item.value === 'string' ? parseFloat(item.value) : item.value;
        result.value = isNaN(numValue) ? fallbackValue : numValue;
      } else {
        result.value = fallbackValue;
      }

      // Copiar otras propiedades que puedan existir
      Object.keys(item).forEach(key => {
        if (key !== 'namedia' && key !== 'name' && key !== 'value') {
          result[key] = item[key];
        }
      });

      return result;
    });
  }

  // Método para formatear fechas del eje X en formato DD-MM-YY
  private formatearFechaEjeX(valor: string): string {
    // Detectar si el valor parece una fecha (formatos comunes del backend)
    // Formatos esperados: YYYY-MM-DD, YY-MM-DD, DD/MM/YYYY, etc.
    const patronFecha = /^(\d{2,4})-(\d{2})-(\d{2})$/; // YYYY-MM-DD o YY-MM-DD
    const patronFecha2 = /^(\d{2})\/(\d{2})\/(\d{4})$/; // DD/MM/YYYY
    
    let match = valor.match(patronFecha);
    if (match) {
      const [_, year, month, day] = match;
      // Si el año tiene 4 dígitos, tomar solo los últimos 2
      const yearShort = year.length === 4 ? year.slice(-2) : year;
      return `${day}-${month}-${yearShort}`;
    }
    
    match = valor.match(patronFecha2);
    if (match) {
      const [_, day, month, year] = match;
      const yearShort = year.slice(-2);
      return `${day}-${month}-${yearShort}`;
    }
    
    // Si no es una fecha reconocible, devolver el valor original
    return valor;
  }

  llenarDataConsultaMeas(nodo: string, sfecha: string){
    this.ApiService.getDataConsultaMeas(nodo, sfecha)
      .pipe(takeUntil(this.destroy$))
      .subscribe( datameas => {
        // Convertir a array si es un objeto único
        const dataArray = Array.isArray(datameas) ? datameas : [datameas];
        this.datameas = this.validateChartData(dataArray);
        
        // NO calcular aquí, esperar a que se carguen los datos del mes
        // El cálculo se hará en llenarDataConsultaMeasMes tomando el valor del día actual
        
        console.log("llenarDataConsultaMeas - Datos cargados para nodo:", nodo);
      })
  }
  llenarDataConsultaMeasMes(nodo: string, sfecha: string){
    this.ApiService.getDataConsultaMeasMes(nodo, sfecha)
      .pipe(takeUntil(this.destroy$))
      .subscribe( datameas => {
        // Convertir a array si es un objeto único
        const dataArray = Array.isArray(datameas) ? datameas : [datameas];
        this.datameasMes = this.validateChartData(dataArray);
      
      // Calcular el total de energía del mes
      this.totalEnergiaMes = this.datameasMes.reduce((total, item) => {
        return total + (item.value || 0);
      }, 0);
      
      // Calcular costo del mes (Watts a Kilowatts y multiplicar por valor)
      this.costoMes = (this.totalEnergiaMes / 1000) * this.valorKilowatt;
      
      // Obtener el valor del día actual (última barra del gráfico mensual)
      // El último elemento representa el consumo acumulado del día actual
      if (this.datameasMes.length > 0) {
        const ultimoDia = this.datameasMes[this.datameasMes.length - 1];
        this.totalEnergiaDia = ultimoDia.value || 0;
        // Calcular costo del día (valor ya está en Watts, convertir a kW)
        this.costoDia = (this.totalEnergiaDia / 1000) * this.valorKilowatt;
        console.log("Consumo día actual (última barra):", this.totalEnergiaDia, "W =", (this.totalEnergiaDia/1000), "kW, Costo:", this.costoDia);
      }
      
      console.log("llenarDataConsultaMeasMes - Total energía mes:", this.totalEnergiaMes, "Costo mes:", this.costoMes);
    })
  }
  // Método para formatear números con separador de miles y 2 decimales con coma
  formatearNumero(numero: number): string {
    return numero.toLocaleString('es-CL', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Función para formatear los valores de las barras del gráfico
  formatearValorBarra = (value: number): string => {
    return value.toLocaleString('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  llenarDataMeasMulti(nodo: string, sfecha: string){
    this.ApiService.getDataConsultaMultiMeasMes(nodo, sfecha)
      .pipe(takeUntil(this.destroy$))
      .subscribe( datamultiMeas  => {
        // Convertir a array si es un objeto único
        const dataArray = Array.isArray(datamultiMeas) ? datamultiMeas : [datamultiMeas];
        this.datamultiMeas = this.validateChartData(dataArray);
      })
    //console.log("llenarDataMeasMulti: " + this.datamultiMeas);
  }

  // Método del ciclo de vida para limpiar subscripciones
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // TrackBy function para optimizar el ngFor de los nodos
  trackByNodo(index: number, nodo: string): string {
    return nodo;
  }

  // Método para calcular el porcentaje de power para el gauge
  getPowerPercentage(nodo: string): number {
    const power = this.powerData[nodo] || 0;
    return (power / this.maxPower) * 100;
  }

  // Método para obtener el color del gauge según el nivel de power
  getGaugeColor(nodo: string): string {
    const power = this.powerData[nodo] || 0;
    const percentage = (power / this.maxPower) * 100;
    
    if (percentage < 33) return '#00FF00'; // Verde
    if (percentage < 66) return '#FFA500'; // Naranja
    return '#FF0000'; // Rojo
  }

  // Método para obtener el esquema de color completo para el gauge
  getGaugeColorScheme(nodo: string): Color {
    return {
      name: 'gaugeScheme',
      selectable: false,
      group: ScaleType.Linear,
      domain: [this.getGaugeColor(nodo)]
    };
  }

  iraclientes(){
    this.router.navigate(['/clientes']);
  }

  iragastos(){
    this.router.navigate(['/gastos']);
  }

  iraenergia(){
    this.router.navigate(['/energia']);
  }

  iraproductos(){
    this.router.navigate(['/productos']);
  }

    iraventas(){
      this.router.navigate(['/home']);
    }

  }
