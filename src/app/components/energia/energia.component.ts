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
import { HttpClient } from '@angular/common/http';

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

interface ThermometerConfig {
  id: string;
  nombre: string;
  url: string;
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
  private readonly MAX_DATA_POINTS = 100; // Límite máximo de datos para gráficos
  
  // WebSocket
  private stompClient: Client | null = null;
  wsConnected = false;
  wsError = false;
  
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
  // IMPORTANTE: Las URLs van directo a la IP del sensor (sin proxy)
  // El servidor del sensor DEBE tener CORS habilitado para aceptar peticiones desde localhost:4200
  thermometers: ThermometerConfig[] = [
    {
      id: 'temp1',
      nombre: 'Temperatura',
      url: 'http://192.168.2.110/api/temperature',
      valor: null,
      error: false,
      ultimaActualizacion: 'N/A'
    }
    // Para agregar más termómetros, descomentar y configurar:
    // {
    //   id: 'temp2',
    //   nombre: 'Temperatura Ext',
    //   url: 'http://192.168.2.111/api/temperature',
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
    private cdr: ChangeDetectorRef,
    private http: HttpClient
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

    // Obtener valor del kilowatt desde la configuración y LUEGO cargar datos
    this.cargarValorKilowatt();
    
    // Cargar datos de termómetros
    this.cargarTermometros();
    
    // Inicializar WebSocket después de cargar datos iniciales
    setTimeout(() => this.initWebSocket(), 2000);

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
    console.log('🔄 Cargando datos del día para todos los nodos...');
    console.log('📅 Fecha formato:', this.ChangedFormat);
    console.log('🔗 Endpoint base:', '/energia/consultar-measures/{nodo}/{fecha}');
    
    let completados = 0;
    const total = this.nodos.length;
    const datosPorNodo: { [key: string]: any[] } = {};
    
    this.nodos.forEach(nodo => {
      console.log(`🔄 Cargando ${nodo} con fecha ${this.ChangedFormat}...`);
      
      // Usar getDataConsultaMeasHora para obtener múltiples mediciones por hora
      this.ApiService.getDataConsultaMeasHora(nodo, this.ChangedFormat)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (datameas: any) => {
            console.log(`📦 Datos recibidos para ${nodo}:`, datameas);
            console.log(`📊 Tipo de datos:`, Array.isArray(datameas) ? 'Array' : typeof datameas);
            console.log(`📏 Cantidad de registros:`, Array.isArray(datameas) ? datameas.length : 1);
            
            const dataArray = Array.isArray(datameas) ? datameas : [datameas];
            // No limitar datos para mostrar el día completo
            
            // Transformar datos del backend (power, fechameas) al formato ngx-charts (name, value)
            const transformedData = dataArray.map(item => ({
              name: this.extraerHoraDeRegistro(item.fechameas),
              value: parseFloat(item.power) || 0
            }));
            
            datosPorNodo[nodo] = transformedData;
            
            console.log(`✅ Datos procesados para ${nodo}:`, datosPorNodo[nodo].length, 'puntos');
            console.log(`📊 Muestra de datos transformados:`, datosPorNodo[nodo].slice(0, 3));
            
            completados++;
            if (completados === total) {
              // Todos los nodos cargados, transformar a formato multi-línea
              this.datameasTodosNodos = this.transformarAMultiLinea(datosPorNodo);
              console.log('✅ Datos multi-línea cargados:', this.datameasTodosNodos.length, 'series');
              console.log('📊 Estructura final:', JSON.stringify(this.datameasTodosNodos, null, 2));
              this.cdr.markForCheck();
            }
          },
          error: (error) => {
            console.error(`❌ Error cargando datos de ${nodo}:`, error);
            console.error(`❌ URL intentada: /energia/consultar-measures/${nodo}/${this.ChangedFormat}`);
            datosPorNodo[nodo] = [];
            
            completados++;
            if (completados === total) {
              this.datameasTodosNodos = this.transformarAMultiLinea(datosPorNodo);
              console.log('⚠️ Datos multi-línea cargados con errores');
              this.cdr.markForCheck();
            }
          }
        });
    });
  }
  
  // Transformar datos de múltiples nodos a formato multi-línea de ngx-charts
  private transformarAMultiLinea(datosPorNodo: { [key: string]: any[] }): any[] {
    const resultado: any[] = [];
    
    // Mapeo de nombres de nodos a descripciones
    const nombreDescripcion: { [key: string]: string } = {
      'T163': 'Negocio',
      'T221': 'PanelSolar',
      'T77': 'CasaFondo',
      'T26': 'CasaCentro'
    };
    
    this.nodos.forEach(nodo => {
      if (datosPorNodo[nodo] && datosPorNodo[nodo].length > 0) {
        resultado.push({
          name: nombreDescripcion[nodo] || nodo,
          series: datosPorNodo[nodo]
        });
      }
    });
    
    return resultado;
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
              this.cdr.markForCheck();
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
              this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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
      this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      })
    //console.log("llenarDataMeasMulti: " + this.datamultiMeas);
  }

  // Método del ciclo de vida para limpiar subscripciones
  ngOnDestroy(): void {
    this.disconnectWebSocket();
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

  // ==================== WEBSOCKET ====================
  
  initWebSocket(): void {
    try {
      // Determinar la URL del WebSocket según el entorno
      let wsUrl: string;
      if (environment.production) {
        // En producción, usar la misma dirección del host actual
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.hostname;
        const port = '8002'; // Puerto del ms-concentrador-energia
        wsUrl = `${protocol}//${host}:${port}/ws-energia`;
      } else {
        // En desarrollo
        wsUrl = 'http://localhost:8002/ws-energia';
      }
      
      console.log('🔌 Conectando WebSocket a:', wsUrl);
      
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        debug: (str) => {
          if (!environment.production) {
            console.log('STOMP Debug:', str);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('✅ WebSocket conectado');
          this.wsConnected = true;
          this.wsError = false;
          this.cdr.markForCheck();
          this.subscribeToNodes();
        },
        onDisconnect: () => {
          console.log('⚠️ WebSocket desconectado');
          this.wsConnected = false;
          this.cdr.markForCheck();
        },
        onStompError: (frame) => {
          console.error('❌ Error STOMP:', frame);
          this.wsError = true;
          this.wsConnected = false;
          this.cdr.markForCheck();
        },
        onWebSocketError: (event) => {
          console.error('❌ Error WebSocket:', event);
          this.wsError = true;
          this.wsConnected = false;
          this.cdr.markForCheck();
        }
      });
      
      this.stompClient.activate();
      
    } catch (error) {
      console.error('❌ Error al inicializar WebSocket:', error);
      this.wsError = true;
      this.cdr.markForCheck();
    }
  }
  
  subscribeToNodes(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('⚠️ No se puede suscribir, cliente no conectado');
      return;
    }
    
    // Suscribirse a cada nodo
    this.nodos.forEach(nodo => {
      const topic = `/topic/estadistica/${nodo}`;
      this.stompClient!.subscribe(topic, (message) => {
        try {
          const notification = JSON.parse(message.body);
          console.log(`📊 Notificación recibida para ${nodo}:`, notification);
          this.handleWebSocketNotification(nodo, notification);
        } catch (error) {
          console.error('❌ Error al procesar notificación:', error);
        }
      });
      console.log(`✅ Suscrito a: ${topic}`);
    });
    
    // También suscribirse al topic global
    this.stompClient.subscribe('/topic/estadistica/all', (message) => {
      try {
        const notification = JSON.parse(message.body);
        console.log('📊 Notificación global:', notification);
      } catch (error) {
        console.error('❌ Error al procesar notificación global:', error);
      }
    });
    console.log('✅ Suscrito a: /topic/estadistica/all');
  }
  
  handleWebSocketNotification(nodo: string, notification: any): void {
    // Actualizar los datos de power del nodo que recibió la notificación
    if (notification.data) {
      const data = notification.data;
      
      // Actualizar power
      if (data.power !== undefined && data.power !== null) {
        this.powerData[nodo] = parseFloat(data.power) || 0;
      }
      
      // Actualizar timestamp
      if (data.fechameas) {
        const fecha = new Date(data.fechameas);
        this.fechameasData[nodo] = this.pipe.transform(fecha, 'HH:mm:ss') || 'N/A';
      }
      
      // Marcar para detección de cambios
      this.cdr.markForCheck();
      
      console.log(`✅ Actualizado ${nodo}: ${this.powerData[nodo]}W a las ${this.fechameasData[nodo]}`);
    }
  }
  
  disconnectWebSocket(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.wsConnected = false;
      console.log('🔌 WebSocket desconectado manualmente');
      this.cdr.markForCheck();
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
   * @param thermometer Configuración del termómetro
   */
  private cargarTemperaturaIndividual(thermometer: ThermometerConfig): void {
    this.http.get<TemperatureResponse>(thermometer.url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: TemperatureResponse) => {
          console.log(`✅ Respuesta termómetro ${thermometer.nombre}:`, response);
          
          if (response.sensor1 && !response.sensor1.error) {
            thermometer.valor = response.sensor1.temperature;
            thermometer.error = false;
            
            // Formatear timestamp si está disponible
            if (response.timestamp) {
              const fecha = new Date(response.timestamp * 1000); // timestamp en segundos
              thermometer.ultimaActualizacion = this.pipe.transform(fecha, 'HH:mm:ss') || 'N/A';
            } else {
              thermometer.ultimaActualizacion = 'Ahora';
            }
            
            console.log(`🌡️ ${thermometer.nombre}: ${thermometer.valor}°C`);
          } else {
            thermometer.valor = null;
            thermometer.error = true;
            thermometer.ultimaActualizacion = 'Error';
            console.error(`❌ Error en sensor ${thermometer.nombre}`);
          }
          
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(`❌ Error cargando ${thermometer.nombre}:`, error);
          thermometer.valor = null;
          thermometer.error = true;
          thermometer.ultimaActualizacion = 'Error';
          this.cdr.markForCheck();
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
