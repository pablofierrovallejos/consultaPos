import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import * as shape from 'd3-shape';

// Interfaces para termómetros
interface TemperatureSensor {
  error: boolean;
  temperature: number;
}

interface TemperatureResponse {
  nroSensoresConfig: number;
  numSensorsDetected: number;
  timestamp: number;
  sensor1: TemperatureSensor;
}

// Interface para datos de temperatura desde el backend
interface TemperaturaData {
  id?: number;
  nombrenodo: string;
  temperatura: number;
  fechahora: string;
  device_ip?: string;
}

interface ThermometerConfig {
  id: string;
  nombre: string;
  nombrenodo: string; // Nombre del nodo en el backend (ej: T110)
  valor: number | null;
  error: boolean;
  ultimaActualizacion: string;
}

@Component({
  selector: 'app-energia',
  templateUrl: './energia.component.html',
  styleUrls: ['./energia.component.css', './energia-gauge-styles.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnergiaComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private isLoadingPower = false; // Bandera para evitar llamadas simultáneas
  private readonly MAX_DATA_POINTS = 60; // 60 puntos = buena resolución sin sobrecargar
  
  // Configuración de interpolación suave para gráficos
  curve: any = shape.curveMonotoneX; // Interpolación suave
  
  // WebSocket
  private stompClient: Client | null = null;
  private wsReconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private wsReconnectTimer: any = null;
  private wsSubscriptions: any[] = [];
  wsConnected = false;
  wsError = false;
  
  // Debounce para notificaciones WebSocket (2 segundos)
  private wsNotificationQueue: Map<string, any> = new Map();
  private wsProcessingTimer: any = null;
  private readonly WS_DEBOUNCE_TIME = 2000;
  
  // Throttle para ChangeDetection
  private lastChangeDetection = 0;
  private readonly MIN_CHANGE_DETECTION_INTERVAL = 500;
  private changeDetectionTimeout: any = null;
  
  // Detector de visibilidad de pestaña
  private isPageVisible = true;
  private visibilityChangeHandler: any = null;
  
  // Limpieza periódica (menos agresiva)
  private memoryCleanupInterval: any = null;
  
  ChangedFormat='';
  ChangedFormatDisplay=''; // Formato DD-MM-YY para mostrar en headers
  datameas: any[] = []; // Ya no se usa para el gráfico principal
  datameasTodosNodos: any[] = []; // Datos multi-línea para todos los nodos
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
  nodos: string[] = ['T163', 'T221', 'T77', 'T26', 'T72'];
  nodoSeleccionado: string = 'T163'; // Nodo por defecto
  powerData: { [key: string]: number } = {}; // Power actual de cada nodo (última medición)
  fechameasData: { [key: string]: string } = {}; // Fecha/hora de la última medición de cada nodo
  maxPower: number = 3500; // Rango máximo de power en watts
  dataPorNodo: { [key: string]: any[] } = {}; // Guardar datos de cada nodo
  energiaDiaData: { [key: string]: number } = {}; // Diferencia de energía del día (última - primera medición)
  nodosVisibles: { [key: string]: boolean } = { // Control de visibilidad de nodos en gráfico
    'T163': true,
    'T221': true,
    'T77': true,
    'T26': true,
    'T72': true
  };
  datameasTodosNodosFiltrados: any[] = []; // Datos filtrados según checkboxes
  
  // Descripciones de los nodos
  nodosDescripcion: { [key: string]: string } = {
    'T163': 'Cons. Negocio',
    'T221': 'PanelSolar Fondo',
    'T77': 'Cons. CasaFondo',
    'T26': 'Cons. CasaCentro',
    'T72': 'PanelSolar Negocio'
  };

  // Configuración modular de termómetros
  // Para agregar más termómetros, simplemente añadir objetos al arreglo
  // Los datos se obtienen desde el microservicio ms-concentrador-energia
  // Endpoint: /api/energia/temperatura/ultimas/{nombrenodo}?limit=1
  thermometers: ThermometerConfig[] = [
    {
      id: 'temp1',
      nombre: 'Temperatura',
      nombrenodo: 'T110', // Nodo configurado en el backend
      valor: null,
      error: false,
      ultimaActualizacion: 'N/A'
    }
    // Para agregar más termómetros, descomentar y configurar:
    // {
    //   id: 'temp2',
    //   nombre: 'Temperatura Ext',
    //   nombrenodo: 'T111',
    //   valor: null,
    //   error: false,
    //   ultimaActualizacion: 'N/A'
    // }
  ];

  pipe = new DatePipe('en-US');
  newDate: string= "";



  constructor(
    private ApiService: ApiService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'yyyy-MM-dd') ?? ''; // Formato 4 dígitos: 2025-12-15
    this.ChangedFormatDisplay = this.pipe.transform(this.changed, 'dd-MM-yy') ?? ''; // Formato para mostrar
    this.newDate = this.pipe.transform(this.changed, 'dd/MM/yyyy') ?? '';

    // Obtener nombre del mes actual
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.nombreMesActual = meses[this.changed.getMonth()];

    // Configurar detector de visibilidad de pestaña
    this.setupPageVisibilityDetection();

    // Obtener valor del kilowatt desde la configuración y LUEGO cargar datos
    this.cargarValorKilowatt();
    
    // Cargar datos de termómetros
    this.cargarTermometros();
    
    // Inicializar WebSocket después de 2 segundos
    setTimeout(() => this.initWebSocket(), 2000);
    
    // LIMPIEZA DESHABILITADA - Estaba recargando datos constantemente
    // this.memoryCleanupInterval = setInterval(() => {
    //   this.limpiarMemoriaAgresiva();
    // }, 120000);

    console.log("ngOnInit(): " + this.ChangedFormat);
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
      domain: ['#FF0C00', '#00C853', '#FFC107', '#2196F3'], // Rojo, Verde, Amarillo, Azul
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


    // Eventos deshabilitados para reducir consumo de memoria y CPU
    // onSelect(data): void {
    //   console.log('Item clicked', JSON.parse(JSON.stringify(data)));
    // }

    // onActivate(data): void {
    //   console.log('Activate', JSON.parse(JSON.stringify(data)));
    // }

    // onDeactivate(data): void {
    //   console.log('Deactivate', JSON.parse(JSON.stringify(data)));
    // }


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
    
    // Cargar datos de TODOS los nodos para el gráfico multi-línea del día
    this.cargarDatosTodosNodosDia();
    
    // Cargar datos del nodo seleccionado para gráficos individuales
    this.llenarDataConsultaMeasMes(this.nodoSeleccionado, this.ChangedFormat);
    this.llenarDataMeasMulti(this.nodoSeleccionado, this.ChangedFormat);
    
    // Cargar power (última medición) de todos los nodos
    this.cargarPowerTodosNodos();
  }

  // Método para cargar datos del día de TODOS los nodos (gráfico multi-línea)
  cargarDatosTodosNodosDia(): void {
    // Solo log esencial
    console.log('🔄 Cargando datos del día...');
    
    let completados = 0;
    const total = this.nodos.length;
    const datosPorNodo: { [key: string]: any[] } = {};
    
    this.nodos.forEach(nodo => {
      // Usar getDataConsultaMeasHora para obtener múltiples mediciones por hora
      this.ApiService.getDataConsultaMeasHora(nodo, this.ChangedFormat)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (datameas: any) => {
            const dataArray = Array.isArray(datameas) ? datameas : [datameas];
            
            // Transformar datos del backend (power, fechameas) al formato ngx-charts (name, value)
            // SIN muestreo - mostrar todos los datos del día completo
            const transformedData = dataArray.map(item => ({
              name: this.extraerHoraDeRegistro(item.fechameas),
              value: parseFloat(item.power) || 0
            }));
            
            datosPorNodo[nodo] = transformedData;
            
            // Calcular diferencia de energía del día (última - primera medición)
            this.calcularEnergiaDia(nodo, dataArray);
            
            completados++;
            if (completados === total) {
              // Todos los nodos cargados, transformar a formato multi-línea
              this.datameasTodosNodos = this.transformarAMultiLinea(datosPorNodo);
              this.datameasTodosNodosFiltrados = [...this.datameasTodosNodos];
              console.log('✅ Cargado:', this.datameasTodosNodos.length, 'series con datos completos');
              this.safeMarkForCheck();
            }
          },
          error: (error) => {
            console.error(`❌ Error ${nodo}:`, error);
            datosPorNodo[nodo] = [];
            
            completados++;
            if (completados === total) {
              this.datameasTodosNodos = this.transformarAMultiLinea(datosPorNodo);
              this.datameasTodosNodosFiltrados = [...this.datameasTodosNodos];
              this.safeMarkForCheck();
            }
          }
        });
    });
  }
  
  // Calcular diferencia de energía del día (última medición - primera medición)
  private calcularEnergiaDia(nodo: string, dataArray: any[]): void {
    if (!dataArray || dataArray.length === 0) {
      this.energiaDiaData[nodo] = 0;
      return;
    }
    
    // Obtener primer y último registro del día
    const primerRegistro = dataArray[0];
    const ultimoRegistro = dataArray[dataArray.length - 1];
    
    const energiaPrimera = parseFloat(primerRegistro?.energy) || 0;
    const energiaUltima = parseFloat(ultimoRegistro?.energy) || 0;
    
    // Calcular diferencia
    const diferencia = energiaUltima - energiaPrimera;
    
    this.energiaDiaData[nodo] = diferencia;
    
    // Usar throttled markForCheck
    this.safeMarkForCheck();
  }
  
  // Transformar datos de múltiples nodos a formato multi-línea de ngx-charts
  private transformarAMultiLinea(datosPorNodo: { [key: string]: any[] }): any[] {
    const resultado: any[] = [];
    
    // Mapeo de nombres de nodos a descripciones
    const nombreDescripcion: { [key: string]: string } = {
      'T163': 'Negocio',
      'T221': 'PanelSolarFondo',
      'T77': 'CasaFondo',
      'T26': 'CasaCentro',
      'T72': 'PanelSolarNegocio'
    };
    
    this.nodos.forEach(nodo => {
      if (datosPorNodo[nodo] && datosPorNodo[nodo].length > 0 && this.nodosVisibles[nodo]) {
        resultado.push({
          name: nombreDescripcion[nodo] || nodo,
          series: datosPorNodo[nodo]
        });
      }
    });
    
    return resultado;
  }
  
  // Método para alternar visibilidad de un nodo en el gráfico
  toggleNodoVisibilidad(nodo: string): void {
    this.nodosVisibles[nodo] = !this.nodosVisibles[nodo];
    // Re-filtrar datos
    this.datameasTodosNodosFiltrados = this.datameasTodosNodos.filter(serie => {
      // Encontrar el nodo correspondiente a esta serie
      const nodoKey = Object.keys(this.nodosVisibles).find(key => {
        const nombreDescripcion: { [key: string]: string } = {
          'T163': 'Negocio',
          'T221': 'PanelSolarFondo',
          'T77': 'CasaFondo',
          'T26': 'CasaCentro',
          'T72': 'PanelSolarNegocio'
        };
        return nombreDescripcion[key] === serie.name;
      });
      return nodoKey && this.nodosVisibles[nodoKey];
    });
    this.safeMarkForCheck();
  }

  // Método para cargar el último valor de power de todos los nodos
  cargarPowerTodosNodos(): void {
    // Evitar llamadas simultáneas
    if (this.isLoadingPower) {
      return;
    }
    
    this.isLoadingPower = true;
    
    let completados = 0;
    const total = this.nodos.length;
    
    this.nodos.forEach(nodo => {
      // Usar getPowerNodo que solo trae el último registro (más eficiente)
      this.ApiService.getPowerNodo(nodo)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (datameas: any) => {
            this.powerData[nodo] = this.extraerPowerDeRegistro(datameas);
            this.fechameasData[nodo] = this.extraerFechameasDeRegistro(datameas);
            
            completados++;
            if (completados === total) {
              this.isLoadingPower = false;
              this.safeMarkForCheck();
            }
          },
          error: (error) => {
            console.error(`❌ Error ${nodo}:`, error);
            this.powerData[nodo] = 0;
            this.fechameasData[nodo] = 'Error';
            
            completados++;
            if (completados === total) {
              this.isLoadingPower = false;
              this.safeMarkForCheck();
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

  // Método auxiliar para extraer solo la hora de fechameas para el eje X del gráfico
  private extraerHoraDeRegistro(fechameas: string): string {
    if (fechameas) {
      const fecha = new Date(fechameas);
      return this.pipe.transform(fecha, 'HH:mm') || 'N/A';
    }
    return 'N/A';
  }

  // Método para cambiar de nodo
  cambiarNodo(nodo: string): void {
    this.nodoSeleccionado = nodo;
    // Solo actualizar gráficos individuales (mes y multi)
    this.llenarDataConsultaMeasMes(nodo, this.ChangedFormat);
    this.llenarDataMeasMulti(nodo, this.ChangedFormat);
  }

  // Método para refrescar los valores de power (llamar cada X segundos)
  refrescarPowerNodos(): void {
    this.cargarPowerTodosNodos();
  }

  // Helper para detectar si un sensor está offline (>10 min sin actualizar)
  isSensorOffline(nodo: string): boolean {
    const timestamp = this.fechameasData[nodo];
    if (!timestamp || timestamp === 'N/A' || timestamp === 'Error') {
      return true; // Sin datos = offline
    }
    
    // Extraer hora del timestamp (formato HH:mm:ss)
    const [horas, minutos, segundos] = timestamp.split(':').map(Number);
    
    // Crear fecha de la última medición (asumiendo que es del día actual)
    const now = new Date();
    const ultimaMedicion = new Date();
    ultimaMedicion.setHours(horas, minutos, segundos, 0);
    
    // Calcular diferencia en minutos
    const diferenciaMs = now.getTime() - ultimaMedicion.getTime();
    const diferenciaMinutos = diferenciaMs / (1000 * 60);
    
    return diferenciaMinutos > 10;
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
        // Limitar datos para evitar sobrecarga
        const limitedData = dataArray.slice(-this.MAX_DATA_POINTS);
        this.datameas = this.validateChartData(limitedData);
        
        // NO calcular aquí, esperar a que se carguen los datos del mes
        // El cálculo se hará en llenarDataConsultaMeasMes tomando el valor del día actual
        
        console.log("llenarDataConsultaMeas - Datos cargados para nodo:", nodo, "(limitado a", limitedData.length, "puntos)");
        this.safeMarkForCheck();
      })
  }
  llenarDataConsultaMeasMes(nodo: string, sfecha: string){
    this.ApiService.getDataConsultaMeasMes(nodo, sfecha)
      .pipe(takeUntil(this.destroy$))
      .subscribe( datameas => {
        // Convertir a array si es un objeto único
        const dataArray = Array.isArray(datameas) ? datameas : [datameas];
        // Limitar datos para evitar sobrecarga (últimos 31 días max)
        const limitedData = dataArray.slice(-31);
        this.datameasMes = this.validateChartData(limitedData);
      
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
      this.safeMarkForCheck();
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
        // Limitar datos para evitar sobrecarga
        const limitedData = dataArray.slice(-this.MAX_DATA_POINTS);
        this.datamultiMeas = this.validateChartData(limitedData);
        this.safeMarkForCheck();
      })
    //console.log("llenarDataMeasMulti: " + this.datamultiMeas);
  }

  // Método para configurar detección de visibilidad de pestaña
  private setupPageVisibilityDetection(): void {
    this.visibilityChangeHandler = () => {
      this.isPageVisible = !document.hidden;
      
      if (this.isPageVisible) {
        console.log('👁️ Pestaña visible - reanudando');
        // Reconectar WebSocket si está desconectado
        if (!this.wsConnected && this.wsReconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          console.log('🔌 Reconectando WebSocket...');
          this.initWebSocket();
        }
      } else {
        console.log('😴 Pestaña oculta - pausando y desconectando');
        // Limpiar cola y timers
        this.wsNotificationQueue.clear();
        if (this.wsProcessingTimer) {
          clearTimeout(this.wsProcessingTimer);
          this.wsProcessingTimer = null;
        }
        // Desconectar WebSocket para liberar recursos
        if (this.wsConnected) {
          console.log('🔌 Desconectando WebSocket por pestaña oculta');
          this.disconnectWebSocket();
        }
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }
  
  // Procesar notificaciones WebSocket con debounce (2 segundos)
  private queueWebSocketNotification(nodo: string, notification: any): void {
    if (!this.isPageVisible) return;
    
    this.wsNotificationQueue.set(nodo, notification);
    
    if (this.wsProcessingTimer) {
      clearTimeout(this.wsProcessingTimer);
    }
    
    this.wsProcessingTimer = setTimeout(() => {
      this.processWebSocketQueue();
    }, this.WS_DEBOUNCE_TIME);
  }
  
  private processWebSocketQueue(): void {
    if (this.wsNotificationQueue.size === 0) return;
    
    this.wsNotificationQueue.forEach((notification, nodo) => {
      if (this.nodos.includes(nodo)) {
        this.handleWebSocketNotification(nodo, notification);
      }
    });
    
    this.wsNotificationQueue.clear();
    this.wsProcessingTimer = null;
  }
  
  // Limpieza AGRESIVA de memoria - Liberar completamente referencias
  private limpiarMemoriaAgresiva(): void {
    console.log('🗑️ Limpieza agresiva de memoria...');
    
    // Nullear y recrear arrays para liberar referencias
    this.datameas = [];
    this.datameasTodosNodos = [];
    this.datameasTodosNodosFiltrados = [];
    this.datameasMes = [];
    this.datamultiMeas = [];
    this.dataPorNodo = {};
    
    // Limpiar colas
    this.wsNotificationQueue.clear();
    
    // Recargar solo datos esenciales con límite de 30 puntos
    console.log('🔄 Recargando datos esenciales...');
    this.cargarDatosTodosNodosDia();
    
    // Forzar garbage collection si está disponible
    if ((window as any).gc) {
      (window as any).gc();
      console.log('🗑️ Garbage collection forzado');
    }
    
    console.log('✅ Memoria liberada y datos recargados');
    this.safeMarkForCheck();
  }
  
  // Limpieza suave de memoria
  private limpiarMemoriaSuave(): void {
    // Solo limpiar si crece anormalmente, sin afectar datos de gráficos principales
    if (this.datameas && this.datameas.length > 500) {
      this.datameas = this.datameas.slice(-300);
    }
    
    // NO aplicar muestreo a datameasTodosNodos - mantener datos completos del día
    // Solo actualizar filtrados según visibilidad
    if (this.datameasTodosNodos && this.datameasTodosNodos.length > 0) {
      this.datameasTodosNodosFiltrados = this.datameasTodosNodos.filter(serie => {
        const nodoKey = Object.keys(this.nodosVisibles).find(key => {
          const nombreDescripcion: { [key: string]: string } = {
            'T163': 'Negocio', 'T221': 'PanelSolarFondo', 'T77': 'CasaFondo',
            'T26': 'CasaCentro', 'T72': 'PanelSolarNegocio'
          };
          return nombreDescripcion[key] === serie.name;
        });
        return nodoKey && this.nodosVisibles[nodoKey];
      });
    }
    
    if (this.datameasMes && this.datameasMes.length > 35) {
      this.datameasMes = this.datameasMes.slice(-31);
    }
    
    if (this.datamultiMeas && this.datamultiMeas.length > 100) {
      this.datamultiMeas = this.datamultiMeas.slice(-100);
    }
    
    if (this.dataPorNodo) {
      Object.keys(this.dataPorNodo).forEach(nodo => {
        if (this.dataPorNodo[nodo] && this.dataPorNodo[nodo].length > 500) {
          this.dataPorNodo[nodo] = this.dataPorNodo[nodo].slice(-300);
        }
      });
    }
    
    if (this.wsNotificationQueue.size > 5) {
      this.wsNotificationQueue.clear();
    }
    
    this.safeMarkForCheck();
  }
  
  // Método para aplicar muestreo inteligente
  private aplicarMuestreo(datos: any[], targetSize: number): any[] {
    if (!datos || datos.length <= targetSize) return datos;
    
    const resultado: any[] = [];
    const step = datos.length / targetSize;
    
    for (let i = 0; i < targetSize; i++) {
      resultado.push(datos[Math.floor(i * step)]);
    }
    
    return resultado;
  }
  
  // ChangeDetection con throttle
  private safeMarkForCheck(): void {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastChangeDetection;
    
    if (timeSinceLastCheck >= this.MIN_CHANGE_DETECTION_INTERVAL) {
      this.lastChangeDetection = now;
      this.cdr.markForCheck();
    } else {
      if (this.changeDetectionTimeout) {
        clearTimeout(this.changeDetectionTimeout);
      }
      
      this.changeDetectionTimeout = setTimeout(() => {
        this.lastChangeDetection = Date.now();
        this.cdr.markForCheck();
        this.changeDetectionTimeout = null;
      }, this.MIN_CHANGE_DETECTION_INTERVAL - timeSinceLastCheck);
    }
  }

  // Método del ciclo de vida para limpiar subscripciones
  ngOnDestroy(): void {
    console.log('🧹 Limpiando componente...');
    
    // Remover event listener de visibilidad
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    
    // Desconectar WebSocket y limpiar subscripciones
    this.disconnectWebSocket();
    
    // Limpiar interval de limpieza
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
    
    // Limpiar todos los timeouts
    if (this.changeDetectionTimeout) {
      clearTimeout(this.changeDetectionTimeout);
      this.changeDetectionTimeout = null;
    }
    
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    
    if (this.wsProcessingTimer) {
      clearTimeout(this.wsProcessingTimer);
      this.wsProcessingTimer = null;
    }
    
    // Limpiar cola de WebSocket
    this.wsNotificationQueue.clear();
    
    // Limpiar arrays grandes para liberar memoria
    this.datameas = [];
    this.datameasTodosNodos = [];
    this.datameasTodosNodosFiltrados = [];
    this.datameasMes = [];
    this.datamultiMeas = [];
    this.dataPorNodo = {};
    this.powerData = {};
    this.fechameasData = {};
    this.energiaDiaData = {};
    
    // Completar destroy$ para cancelar TODAS las subscripciones HTTP pendientes
    this.destroy$.next();
    this.destroy$.complete();
    
    console.log('✅ Limpieza completada - memoria liberada');
  }

  // TrackBy function para optimizar el ngFor de los nodos
  trackByNodo(index: number, nodo: string): string {
    return nodo;
  }

  // Método para formatear energía con coma como separador decimal y 1 dígito
  formatearEnergia(valor: number): string {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return 'N/A';
    }
    return valor.toFixed(1).replace('.', ',');
  }

  // Método para calcular el porcentaje de power para el gauge
  getPowerPercentage(nodo: string): number {
    const power = this.powerData[nodo] || 0;
    return (power / this.maxPower) * 100;
  }

  // Método para obtener el color del gauge según el nivel de power
  getGaugeColor(nodo: string): string {
    // Los nodos de paneles solares (T221 y T72) siempre en verde (generan energía)
    if (nodo === 'T221' || nodo === 'T72') {
      return '#00FF00'; // Verde siempre para paneles solares
    }
    
    const power = this.powerData[nodo] || 0;
    const percentage = (power / this.maxPower) * 100;
    
    if (percentage < 33) return '#00FF00'; // Verde
    if (percentage < 66) return '#FFA500'; // Naranja
    return '#FF0000'; // Rojo
  }
  
  // Método simple para obtener color de fondo (HTML/CSS simple)
  getGaugeColorSimple(nodo: string): string {
    const color = this.getGaugeColor(nodo);
    return `linear-gradient(135deg, ${color}22, ${color}88)`;
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
  
  iraconciliacion(){
    this.router.navigate(['/conciliacion']);
  }

  // ==================== WEBSOCKET ====================
  
  initWebSocket(): void {
    if (this.wsReconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn('⚠️ Límite de reconexiones alcanzado');
      this.wsError = true;
      this.wsConnected = false;
      this.safeMarkForCheck();
      return;
    }
    
    try {
      this.wsReconnectAttempts++;
      console.log(`🔌 Conectando WebSocket (${this.wsReconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
      
      let wsUrl: string;
      if (environment.production) {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.hostname;
        const port = '8002';
        wsUrl = `${protocol}//${host}:${port}/ws-energia`;
      } else {
        wsUrl = 'http://localhost:8002/ws-energia';
      }
      
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        debug: (str) => {}, // Desactivado para reducir logs
        reconnectDelay: 10000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log('✅ WebSocket conectado');
          this.wsConnected = true;
          this.wsError = false;
          this.wsReconnectAttempts = 0;
          this.safeMarkForCheck();
          this.subscribeToNodes();
        },
        onDisconnect: () => {
          console.log('⚠️ WebSocket desconectado');
          this.wsConnected = false;
          this.safeMarkForCheck();
        },
        onStompError: (frame) => {
          console.error('❌ Error STOMP');
          this.wsError = true;
          this.wsConnected = false;
          this.safeMarkForCheck();
          
          if (this.wsReconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.wsReconnectTimer = setTimeout(() => this.initWebSocket(), 15000);
          }
        },
        onWebSocketError: (event) => {
          console.error('❌ Error WebSocket');
          this.wsError = true;
          this.wsConnected = false;
          this.safeMarkForCheck();
        }
      });
      
      this.stompClient.activate();
      
    } catch (error) {
      console.error('❌ Error al inicializar WebSocket:', error);
      this.wsError = true;
      this.safeMarkForCheck();
      
      if (this.wsReconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.wsReconnectTimer = setTimeout(() => this.initWebSocket(), 15000);
      }
    }
  }
  
  subscribeToNodes(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('⚠️ No se puede suscribir, cliente no conectado');
      return;
    }
    
    // Desuscribir anteriores
    this.wsSubscriptions.forEach(sub => {
      try { sub.unsubscribe(); } catch (e) {}
    });
    this.wsSubscriptions = [];
    
    // Suscribirse a cada nodo con debounce
    this.nodos.forEach(nodo => {
      const topic = `/topic/estadistica/${nodo}`;
      const subscription = this.stompClient!.subscribe(topic, (message) => {
        try {
          const notification = JSON.parse(message.body);
          this.queueWebSocketNotification(nodo, notification);
        } catch (error) {
          console.error('❌ Error en notificación:', error);
        }
      });
      this.wsSubscriptions.push(subscription);
      console.log(`✅ Suscrito: ${topic}`);
    });
    
    // Suscribirse a temperatura (sin debounce, menos frecuente)
    this.thermometers.forEach(thermometer => {
      const topic = `/topic/temperatura/${thermometer.nombrenodo}`;
      const subscription = this.stompClient!.subscribe(topic, (message) => {
        try {
          const notification = JSON.parse(message.body);
          this.handleTemperatureWebSocketNotification(thermometer, notification);
        } catch (error) {
          console.error('❌ Error temperatura:', error);
        }
      });
      this.wsSubscriptions.push(subscription);
      console.log(`✅ Suscrito temp: ${topic}`);
    });
    
    console.log(`📊 Total subscripciones: ${this.wsSubscriptions.length}`);
  }
  
  handleWebSocketNotification(nodo: string, notification: any): void {
    if (notification.data) {
      const data = notification.data;
      
      if (data.power !== undefined && data.power !== null) {
        const newPower = parseFloat(data.power) || 0;
        const oldPower = this.powerData[nodo] || 0;
        
        // Solo actualizar si cambia más de 5W
        if (Math.abs(newPower - oldPower) > 5 || oldPower === 0) {
          this.powerData[nodo] = newPower;
          
          if (data.fechameas) {
            const fecha = new Date(data.fechameas);
            this.fechameasData[nodo] = this.pipe.transform(fecha, 'HH:mm:ss') || 'N/A';
          }
          
          this.safeMarkForCheck();
          
          // Log solo en cambios grandes
          if (Math.abs(newPower - oldPower) > 50) {
            console.log(`⚡ ${nodo}: ${newPower}W`);
          }
        }
      }
    }
  }
  
  /**
   * Maneja las notificaciones de temperatura recibidas por WebSocket
   * @param thermometer Configuración del termómetro
   * @param notification Datos de la notificación
   */
  handleTemperatureWebSocketNotification(thermometer: ThermometerConfig, notification: any): void {
    if (notification.data) {
      const data = notification.data;
      
      if (data.temperatura !== undefined && data.temperatura !== null) {
        const newTemp = parseFloat(data.temperatura);
        const oldTemp = thermometer.valor || 0;
        
        // Solo actualizar si cambia más de 0.5°C
        if (Math.abs(newTemp - oldTemp) > 0.5 || oldTemp === 0) {
          thermometer.valor = newTemp;
          thermometer.error = false;
          
          if (data.fechahora) {
            const fecha = new Date(data.fechahora);
            thermometer.ultimaActualizacion = this.pipe.transform(fecha, 'HH:mm:ss') || 'N/A';
          }
          
          this.safeMarkForCheck();
          
          // Log solo en cambios grandes
          if (Math.abs(newTemp - oldTemp) > 2) {
            console.log(`🌡️ ${thermometer.nombrenodo}: ${newTemp}°C`);
          }
        }
      }
    }
  }
  
  disconnectWebSocket(): void {
    if (this.stompClient) {
      this.wsSubscriptions.forEach(sub => {
        try { sub.unsubscribe(); } catch (e) {}
      });
      this.wsSubscriptions = [];
      
      try {
        this.stompClient.deactivate();
      } catch (error) {
        console.error('Error al desactivar WebSocket:', error);
      }
      this.stompClient = null;
      this.wsConnected = false;
      console.log('🔌 WebSocket desconectado');
      this.safeMarkForCheck();
    }
  }

  // ========== MÉTODOS PARA TERMÓMETROS ==========
  
  /**
   * Cargar datos de todos los termómetros configurados
   * Método modular: itera sobre el array de configuración
   */
  cargarTermometros(): void {
    console.log('🌡️ Cargando datos de termómetros...');
    
    this.thermometers.forEach(thermometer => {
      this.cargarTemperaturaIndividual(thermometer);
    });
  }

  /**
   * Cargar temperatura de un termómetro individual
   * Obtiene la última medición desde el microservicio ms-concentrador-energia
   * @param thermometer Configuración del termómetro
   */
  private cargarTemperaturaIndividual(thermometer: ThermometerConfig): void {
    // Obtener la última medición (limit=1) desde el backend
    this.ApiService.getTemperaturaUltimas(thermometer.nombrenodo, 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: TemperaturaData[]) => {
          console.log(`✅ Respuesta temperatura ${thermometer.nombre} (${thermometer.nombrenodo}):`, response);
          
          // El backend retorna un array, tomar el primer elemento
          if (response && response.length > 0) {
            const data = response[0];
            thermometer.valor = data.temperatura;
            thermometer.error = false;
            
            // Formatear timestamp desde fechahora
            if (data.fechahora) {
              const fecha = new Date(data.fechahora);
              thermometer.ultimaActualizacion = this.pipe.transform(fecha, 'HH:mm:ss') || 'N/A';
            } else {
              thermometer.ultimaActualizacion = 'Ahora';
            }
            
            console.log(`🌡️ ${thermometer.nombre}: ${thermometer.valor}°C a las ${thermometer.ultimaActualizacion}`);
          } else {
            thermometer.valor = null;
            thermometer.error = true;
            thermometer.ultimaActualizacion = 'Sin datos';
            console.warn(`⚠️ No hay datos para ${thermometer.nombre} (${thermometer.nombrenodo})`);
          }
          
          this.safeMarkForCheck();
        },
        error: (error) => {
          console.error(`❌ Error cargando ${thermometer.nombre}:`, error);
          thermometer.valor = null;
          thermometer.error = true;
          thermometer.ultimaActualizacion = 'Error';
          this.safeMarkForCheck();
        }
      });
  }

  /**
   * Refrescar todos los termómetros
   * Puede ser llamado manualmente o por un interval
   */
  refrescarTermometros(): void {
    this.cargarTermometros();
  }

  /**
   * Obtener clase CSS según el valor de temperatura
   * @param valor Temperatura en °C
   */
  getTemperatureClass(valor: number | null): string {
    if (valor === null) return 'temp-error';
    if (valor < 15) return 'temp-cold';
    if (valor >= 15 && valor < 25) return 'temp-normal';
    if (valor >= 25 && valor < 30) return 'temp-warm';
    return 'temp-hot';
  }

  /**
   * TrackBy function para optimizar el ngFor de termómetros
   */
  trackByThermometer(index: number, thermometer: ThermometerConfig): string {
    return thermometer.id;
  }

}
