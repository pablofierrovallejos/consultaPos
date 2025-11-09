import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { DatePipe } from '@angular/common';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import {FormGroup,FormControl,Validators,FormArray} from '@angular/forms';
import {MatToolbarModule} from '@angular/material/toolbar';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { trigger, transition, style, animate } from '@angular/animations';

// Interfaz para Toast
interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class HomeComponent {

  // Propiedades de autenticación
  isAuthenticated: boolean = false;
  username: string = '';
  password: string = '';
  loginError: string = '';

  // Credenciales válidas
  private readonly validUsername = 'hp';
  private readonly validPassword = 'hp';
  private readonly authCookieName = 'consultaPos_auth';

  // Propiedades para notificaciones WebSocket
  private socket: WebSocket | null = null;
  showNotification: boolean = false;
  notificationData: any = null;
  private notificationTimeout: any = null;
  private audioPreparado: boolean = false;
  showAudioHint: boolean = true; // Mostrar hint de interacción
  private sonidoReproduciendose: boolean = false; // Control para evitar sonidos múltiples

  // Propiedades para sistema de Toasts
  toasts: Toast[] = [];
  private toastIdCounter: number = 0;

  // Propiedades para Modal de Confirmación
  showConfirmModal: boolean = false;
  confirmModalData: any = null;
  private confirmCallback: (() => void) | null = null;

  dataProductos : any[] = [];
  dataventas : any[] = [];
  dataestadistica: any[] = [];
  dataconsultaventas: any[] = [];
  dataestadisticaVentasProd: any[] = []; // Ventas MENSUALES por producto (totales)
  dataestadisticaVentasDiariaProd: any[] = []; // Ventas DIARIAS de un producto específico
  dataestadisticaProd: any[] = [];

  // Propiedades para totales
  totalMonto: number = 0;
  totalTarjeta: number = 0;
  totalVentasMes: number = 0; // Total de ventas del mes actual

  // Producto seleccionado para gráfico diario
  productoSeleccionado: string = '';

  // Propiedades adicionales para gráficos
  label: string = 'Porcentaje';
  animations: boolean = true;
  y_etiquetaVtaDiariaCant: string = 'Cantidad';
  showXAxisLabelVMP: string = 'Productos';

  nombreMesActual = "";
  nombreMesAnterior = "";
  nombreMesSiguiente = "";
  MesActual= "";
  fecha = new Date();
  changed : any;
  ChangedFormat: any;
  ChangedFormat2: any;
  MesActualFormat: any;
  mesActualparaProductos:any;

  // Propiedades para los gráficos
  view: any = undefined; // undefined hace que el gráfico sea responsive
  viewPie: [number, number] = [1200, 500]; // Vista más ancha para el gráfico de torta
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Días';
  showYAxisLabel = true;
  yAxisLabel = 'Importe';
  showDataLabel = true;
  xAxisLabelVMP='Productos';

  colorSchemeBar: Color = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0']
  };

  constructor(private api: ApiService, private router: Router) {
    // Verificar autenticación al cargar
    this.checkAuthenticationStatus();
  }

  ngOnInit(): void {
    if (this.isAuthenticated) {
      this.loadDashboardData();
      this.conectarWebSocket();
      this.prepararAudio();
    }
  }

  ngOnDestroy(): void {
    this.desconectarWebSocket();
  }

  // Método para verificar el estado de autenticación
  checkAuthenticationStatus(): void {
    const authCookie = this.getCookie(this.authCookieName);
    this.isAuthenticated = authCookie === 'authenticated';
  }

  // Método para cargar datos del dashboard
  loadDashboardData(): void {
    this.getProductos();
    this.getVentas();
    this.getVentasEstadistica();
    this.getVentasDia();
    this.getVentasEstadisticaProductos();
    
    // Registrar auditoría de consulta del home
    this.registrarAuditoriaConsultaHome();
  }

  // Método para registrar auditoría de consulta del home
  async registrarAuditoriaConsultaHome(): Promise<void> {
    try {
      // Obtener geolocalización
      const geoData = await this.obtenerGeolocalizacion();

      // Preparar datos de auditoría
      const auditoria = {
        hostorigen: geoData.query || 'localhost',
        modulo: '/home',
        accionrealizada: 'Consulta Home',
        usuario: this.username || 'hp',
        detalles: `Acceso al dashboard principal | Precisión: ${geoData.precision} | ISP: ${geoData.isp} | Ciudad: ${geoData.city}`,
        dataprocesada: JSON.stringify({
          fecha_acceso: new Date().toISOString(),
          url: window.location.href,
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

      // Registrar auditoría de forma asíncrona (no bloquear la carga del dashboard)
      this.api.registrarAuditoria(auditoria).subscribe(
        () => {
          console.log('✅ Auditoría de consulta home registrada');
        },
        (error) => {
          console.warn('⚠️ No se pudo registrar auditoría de consulta home:', error);
        }
      );

    } catch (error) {
      console.error('❌ Error al registrar auditoría de consulta home:', error);
    }
  }

  // Método de login
  login(): void {
    this.loginError = '';

    if (this.username === this.validUsername && this.password === this.validPassword) {
      this.isAuthenticated = true;
      this.setCookie(this.authCookieName, 'authenticated', 30); // Cookie válida por 30 días
      this.loadDashboardData();
      this.username = '';
      this.password = '';
    } else {
      this.loginError = 'Usuario o contraseña incorrectos';
      this.password = ''; // Limpiar solo la contraseña
    }
  }

  // Método de logout
  logout(): void {
    this.isAuthenticated = false;
    this.deleteCookie(this.authCookieName);
    this.username = '';
    this.password = '';
    this.loginError = '';
  }

  // Utilidades para cookies
  setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }

  getCookie(name: string): string {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return '';
  }

  deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // ========== MÉTODOS PARA WEBSOCKET Y NOTIFICACIONES ==========
  
  conectarWebSocket(): void {
    // Usar URL del environment según el ambiente (dev o prod)
    let wsUrl = environment.notificacionesWsUrl;
    
    // Si la URL es relativa (comienza con /), construir URL completa
    if (wsUrl.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Usar host completo (incluye puerto si existe) para evitar mixed-port blocking
      const host = window.location.host; // hostname:port
      wsUrl = `${protocol}//${host}${wsUrl}`;
    }

    console.log('Conectando a WebSocket:', wsUrl);
    console.log('Environment:', environment.production ? 'Producción' : 'Desarrollo');

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = (event) => {
        console.log('✅ WebSocket conectado exitosamente');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Mensaje recibido del WebSocket:', data);
          console.log('Tipo de mensaje:', data.tipo);
          
          if (data.tipo === 'ventas') {
            console.log('🎯 Es un mensaje de ventas, llamando a mostrarNotificacion...');
            this.mostrarNotificacion(data);
          } else {
            console.log('ℹ️ Mensaje ignorado, tipo:', data.tipo);
          }
        } catch (e) {
          console.error('Error al procesar mensaje:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
      };

      this.socket.onclose = (event) => {
        console.log('⚫ WebSocket desconectado');
        this.socket = null;
        // Intentar reconectar después de 5 segundos
        setTimeout(() => {
          if (this.isAuthenticated) {
            console.log('Intentando reconectar...');
            this.conectarWebSocket();
          }
        }, 5000);
      };

    } catch (error) {
      console.error('Error al crear WebSocket:', error);
    }
  }

  desconectarWebSocket(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  mostrarNotificacion(data: any): void {
    console.log('📢 mostrarNotificacion llamado con:', data);
    
    // Guardar datos de la notificación
    this.notificationData = {
      hora: new Date().toLocaleTimeString('es-CL'),
      totalTransacciones: data.total_transacciones || 0,
      montoTotal: data.total_monto || 0
    };

    console.log('📊 notificationData:', this.notificationData);

    // Reproducir sonido
    this.reproducirSonido();

    // Mostrar notificación
    this.showNotification = true;
    console.log('✅ showNotification establecido a:', this.showNotification);

    // Limpiar timeout anterior si existe
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Ocultar después de 5 segundos
    this.notificationTimeout = setTimeout(() => {
      this.showNotification = false;
      this.notificationData = null;
      console.log('⏱️ Notificación ocultada por timeout');
    }, 5000);

    // Recargar datos del dashboard
    this.getVentasEstadistica();
    this.getVentasDia();
  }

  reproducirSonido(): void {
    // Evitar reproducir si ya hay un sonido reproduciéndose
    if (this.sonidoReproduciendose) {
      console.log('🔇 Sonido ya reproduciéndose, ignorando...');
      return;
    }

    try {
      this.sonidoReproduciendose = true;
      
      // Agregar timestamp para evitar caché del navegador
      const timestamp = new Date().getTime();
      const audio = new Audio(`assets/notification-bell.mp3?t=${timestamp}`);
      audio.volume = 0.5; // Volumen al 50%
      
      console.log('🔊 Intentando reproducir sonido...');
      
      // Resetear el flag cuando termine el sonido
      audio.onended = () => {
        this.sonidoReproduciendose = false;
        console.log('✅ Sonido finalizado');
      };
      
      audio.play()
        .then(() => {
          console.log('✅ Sonido reproducido exitosamente');
          // Por si acaso el evento onended no se dispara, resetear después de 2 segundos
          setTimeout(() => {
            this.sonidoReproduciendose = false;
          }, 2000);
        })
        .catch(error => {
          this.sonidoReproduciendose = false; // Resetear si falla
          console.warn('⚠️ No se pudo reproducir el sonido:', error);
          console.log('Esto puede ser normal si el usuario no ha interactuado con la página aún');
        });
    } catch (error) {
      this.sonidoReproduciendose = false; // Resetear si hay error
      console.error('❌ Error al crear el objeto Audio:', error);
    }
  }

  // Preparar audio para evitar problemas con políticas de autoplay
  prepararAudio(): void {
    if (!this.audioPreparado) {
      try {
        // Crear un audio silencioso
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        silentAudio.volume = 0.01;
        
        // Función para habilitar audio con cualquier interacción
        const habilitarAudio = () => {
          if (!this.audioPreparado) {
            silentAudio.play().then(() => {
              this.audioPreparado = true;
              this.showAudioHint = false; // Ocultar el hint
              console.log('✅ Audio habilitado - las notificaciones sonarán');
              // Remover listeners después de habilitar
              document.removeEventListener('click', habilitarAudio);
              document.removeEventListener('keydown', habilitarAudio);
              document.removeEventListener('touchstart', habilitarAudio);
            }).catch((error) => {
              console.log('⚠️ Aún esperando interacción del usuario:', error.message);
            });
          }
        };
        
        // Agregar múltiples eventos para capturar la primera interacción
        document.addEventListener('click', habilitarAudio, { once: false });
        document.addEventListener('keydown', habilitarAudio, { once: false });
        document.addEventListener('touchstart', habilitarAudio, { once: false });
        
        console.log('🔊 Sistema de audio listo - haz clic en la página para habilitar sonidos');
        
      } catch (error) {
        console.log('No se pudo preparar el audio:', error);
      }
    }
  }

  // ========== FIN MÉTODOS WEBSOCKET ==========

  // Método para validar datos del gráfico
  validateChartData(data: any[]): any[] {
    return data.map(item => ({
      name: item.namedia || item.name || 'Sin nombre',
      value: typeof item.value === 'string' ? parseFloat(item.value) || 0 : item.value || 0
    }));
  }

  getProductos(){
    this.api.getProductos().subscribe((data: any) => {
      this.dataProductos = data;
    });
  }

  getVentas(){
    this.api.getVentas().subscribe((data: any) => {
      this.dataventas = data;
    });
  }

  getVentasEstadistica(){
    // Enviar fecha completa (primer día del mes) para el SP
    this.MesActual = this.fecha.getFullYear()+"-"+(this.fecha.getMonth()+1).toString().padStart(2,'0')+"-01";
    this.nombreMesActual = this.obtenerNombreMes(this.fecha.getMonth());
    this.MesActualFormat = this.MesActual;

    this.api.getVentasEstadistica(this.MesActual).subscribe((data: any) => {
      console.log('Datos recibidos de estadística:', data);
      this.dataestadistica = this.validateChartData(data);
      console.log('Datos validados para gráfico:', this.dataestadistica);
      this.calcularTotalVentasMes(); // Calcular total del mes
    });
  }

  getVentasDia(){
    this.changed = this.fecha.getFullYear()+"-"+(this.fecha.getMonth()+1).toString().padStart(2,'0')+"-"+this.fecha.getDate().toString().padStart(2,'0');
    this.ChangedFormat = this.changed;
    this.ChangedFormat2 = this.fecha.getDate().toString().padStart(2,'0');

    this.api.getVentasDia(this.changed).subscribe((data: any) => {
      this.dataconsultaventas = data;
      this.calcularTotales(); // Calcular totales después de recibir los datos
      this.verificarBoletasEmitidas(); // Verificar estado de boletas
    });
  }

  // Método para verificar boletas emitidas
  async verificarBoletasEmitidas(): Promise<void> {
    if (!this.dataconsultaventas || this.dataconsultaventas.length === 0) {
      return;
    }

    // Crear un array de promesas para consultar todas las boletas en paralelo
    const promesas = this.dataconsultaventas.map(async (venta: any) => {
      if (!venta.idcorrelativo) {
        return;
      }

      try {
        // Consultar boletas específicas de esta venta
        const response: any = await this.api.obtenerBoletasPorVenta(venta.idcorrelativo).toPromise();
        
        // El microservicio retorna { success: true, boletas: [...], count: N }
        if (response && response.success && response.boletas && response.boletas.length > 0) {
          // Tomar la primera boleta (debería haber solo una por venta)
          const boleta = response.boletas[0];
          
          // Actualizar estado de la venta
          venta.trazastattransbk = 'EMITIDO';
          venta.numeroFolio = boleta.folio || boleta.numero_folio || 'N/A';
          venta.boletaEmitida = true;
          
          console.log(`Boleta encontrada para venta ${venta.idcorrelativo}: Folio ${venta.numeroFolio}`);
        }
      } catch (error: any) {
        // Si no hay boleta o hay error, simplemente no hacemos nada
        // La venta quedará como "Sin Emitir"
        if (error.status !== 404) {
          console.log(`No hay boleta para venta ${venta.idcorrelativo}`);
        }
      }
    });

    try {
      // Esperar a que todas las consultas terminen
      await Promise.all(promesas);
      console.log('Verificación de boletas completada');
    } catch (error: any) {
      console.error('Error general al verificar boletas:', error);
    }
  }

  // Método para calcular totales de ventas del día
  calcularTotales(): void {
    this.totalMonto = 0;
    this.totalTarjeta = 0;

    if (this.dataconsultaventas && this.dataconsultaventas.length > 0) {
      this.dataconsultaventas.forEach((venta: any) => {
        const totalImporte = Number(venta.totalimporte) || 0;

        // Sumar al total general
        this.totalMonto += totalImporte;

        // Si es pago con tarjeta, sumar al total de tarjeta
        if (venta.tipopago === 'TARJETA' || venta.tipopago === 'Tarjeta' || venta.tipopago === 'tarjeta') {
          this.totalTarjeta += totalImporte;
        }
      });
    }

  }

  // Método para formatear montos con punto como separador de miles
  formatearMonto(valor: number): string {
    return Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Método para calcular el total de ventas del mes
  calcularTotalVentasMes(): void {
    this.totalVentasMes = 0;
    if (this.dataestadistica && this.dataestadistica.length > 0) {
      this.dataestadistica.forEach((item: any) => {
        const valor = Number(item.value) || 0;
        this.totalVentasMes += valor;
      });
    }
  }

  getVentasEstadisticaProductos(){
    // Enviar fecha completa (primer día del mes) para el SP
    this.mesActualparaProductos = this.fecha.getFullYear()+"-"+(this.fecha.getMonth()+1).toString().padStart(2,'0')+"-01";

    // Obtener ventas MENSUALES de productos más vendidos
    this.api.getVentasEstadisticaProductos(this.mesActualparaProductos).subscribe((data: any) => {
      console.log('Datos recibidos de productos mensuales:', data);
      this.dataestadisticaVentasProd = this.validateChartData(data);
      console.log('Datos validados para gráfico productos mensuales:', this.dataestadisticaVentasProd);
    });

    // Si hay un producto seleccionado, cargar sus ventas diarias
    if (this.productoSeleccionado) {
      this.cargarVentasDiariasProducto(this.productoSeleccionado);
    }
  }

  cargarVentasDiariasProducto(nombreProducto: string): void {
    const fecha = this.fecha.getFullYear()+"-"+(this.fecha.getMonth()+1).toString().padStart(2,'0')+"-01";

    this.api.getEstadisticasVentasMesProd(fecha, nombreProducto).subscribe((data: any) => {
      console.log('Datos recibidos de ventas diarias del producto:', nombreProducto, data);
      this.dataestadisticaVentasDiariaProd = this.validateChartData(data);
      console.log('Datos validados para gráfico ventas diarias:', this.dataestadisticaVentasDiariaProd);
    }, error => {
      console.error('Error al cargar ventas diarias del producto:', error);
      this.dataestadisticaVentasDiariaProd = [];
    });
  }

  iraproductos(){
    this.router.navigate(['/productos']);
  }

  iraventas(){
    this.router.navigate(['/ingresoventa']);
  }

  iraenergia(){
    this.router.navigate(['/energia']);
  }

  iraclientes(){
    this.router.navigate(['/clientes']);
  }

  iragastos(){
    this.router.navigate(['/gastos']);
  }

  mesAnterior(){
    this.fecha.setMonth(this.fecha.getMonth()-1);
    this.getVentasEstadistica();
    this.getVentasEstadisticaProductos();
  }

  mesSiguiente(){
    this.fecha.setMonth(this.fecha.getMonth()+1);
    this.getVentasEstadistica();
    this.getVentasEstadisticaProductos();
  }

  diaAnterior(){
    this.fecha.setDate(this.fecha.getDate()-1);
    this.getVentasDia();
  }

  diaSiguiente(){
    this.fecha.setDate(this.fecha.getDate()+1);
    this.getVentasDia();
  }

  obtenerNombreMes(mes: number): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes];
  }

  SendDataonChange(event: any) {
    this.ChangedFormat = event.target.value;
    this.changed = event.target.value;
    const fechaSeleccionada = new Date(event.target.value + 'T00:00:00');
    this.ChangedFormat2 = fechaSeleccionada.getDate().toString().padStart(2,'0');

    this.api.getVentasDia(this.changed).subscribe((data: any) => {
      this.dataconsultaventas = data;
      this.calcularTotales(); // Calcular totales
      this.verificarBoletasEmitidas(); // Verificar estado de boletas
    });
  }

  // Método para emitir boleta
  async emitirBoleta(item: any, index: number): Promise<void> {
    // Validar que tenga monto e idventa
    if (!item.totalimporte || item.totalimporte <= 0) {
      this.showToast('error', 'Validación', 'El monto de la venta no es válido');
      return;
    }

    if (!item.idcorrelativo) {
      this.showToast('error', 'Validación', 'No se encontró el ID de la venta');
      return;
    }

    // Bloquear botón e iniciar contador
    item.emitiendo = true;
    item.contadorEmision = 15;

    // Iniciar contador regresivo
    const intervalo = setInterval(() => {
      if (item.contadorEmision > 0) {
        item.contadorEmision--;
      }
    }, 1000);

    try {
      // Llamar al servicio de emitir boleta con idventa
      const response: any = await this.api.emitirBoleta(
        item.idcorrelativo,  // ID correlativo de la venta
        item.totalimporte,
        `Venta #${item.idcorrelativo} - ${item.fechaventa}`
      ).toPromise();

      console.log('Respuesta emitir boleta:', response);

      // Detener contador
      clearInterval(intervalo);

      // Extraer número de folio de la respuesta
      const numeroFolio = response.folio || response.numero_folio || response.numeroFolio || 'N/A';

      // Actualizar el estado en la vista
      item.trazastattransbk = 'EMITIDO';  // Estado visual
      item.numeroFolio = numeroFolio;     // Guardar folio para descarga
      item.boletaEmitida = true;          // Flag para mostrar botón de descarga
      item.emitiendo = false;
      item.contadorEmision = 0;

      // Actualizar la fila visualmente
      this.dataconsultaventas[index] = { ...item };

      // Ya no mostramos alert de confirmación

    } catch (error: any) {
      console.error('Error al emitir boleta:', error);
      
      // Detener contador en caso de error
      clearInterval(intervalo);
      
      item.emitiendo = false;
      item.contadorEmision = 0;
      this.showToast('error', 'Error al Emitir Boleta', error.error?.message || error.message || 'Error desconocido');
    }
  }

  // Método para ver boleta en ventana emergente
  async verBoleta(item: any): Promise<void> {
    if (!item.numeroFolio || item.numeroFolio === 'N/A') {
      this.showToast('info', 'Información', 'No hay boleta disponible para visualizar');
      return;
    }

    try {
      // Mostrar indicador de carga
      item.cargandoBoleta = true;

      // Obtener PDF desde el servidor
      const blob = await this.api.descargarBoletaPDF(item.numeroFolio).toPromise();
      
      if (!blob) {
        throw new Error('No se pudo obtener el archivo PDF');
      }

      // Crear URL temporal para visualización
      const url = window.URL.createObjectURL(blob);
      
      // Abrir en ventana emergente
      const ventana = window.open(url, '_blank', 'width=800,height=600,toolbar=no,menubar=no,scrollbars=yes');
      
      if (!ventana) {
        // Si el popup fue bloqueado, abrir en pestaña nueva
        window.open(url, '_blank');
      }
      
      // Limpiar URL después de un tiempo (dar tiempo para que se cargue)
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 5000);
      
      item.cargandoBoleta = false;

    } catch (error: any) {
      console.error('Error al visualizar boleta:', error);
      item.cargandoBoleta = false;
      this.showToast('error', 'Error al Visualizar', error.error?.message || error.message || 'Error desconocido');
    }
  }

  // Método para eliminar venta
  async eliminarVenta(item: any, index: number): Promise<void> {
    // Validar que tenga idcorrelativo
    if (!item.idcorrelativo) {
      this.showToast('error', 'Error', 'No se encontró el ID correlativo de la venta');
      return;
    }

    // Guardar referencia para usar en el callback
    const itemToDelete = item;
    const itemIndex = index;

    // Mostrar modal de confirmación
    this.confirmModalData = item;
    this.showConfirmModal = true;
    
    // Definir callback de confirmación
    this.confirmCallback = async () => {
      try {
        // Bloquear botón
        itemToDelete.eliminando = true;

        // Obtener geolocalización
        const geoData = await this.obtenerGeolocalizacion();

        // Llamar al endpoint de eliminación
        await this.api.eliminarVenta(itemToDelete.idcorrelativo).toPromise();

        // Preparar datos para auditoría
        const dataProcesada = {
          idcorrelativo: itemToDelete.idcorrelativo,
          idventa: itemToDelete.idventa,
          totalimporte: itemToDelete.totalimporte,
          nroboleta: itemToDelete.nroboleta || 'N/A',
          fechaventa: itemToDelete.fechaventa
        };

        const auditoria = {
          hostorigen: geoData.query || 'localhost',
          modulo: '/api/productos/eliminar-venta',
          accionrealizada: 'Eliminación de venta',
          usuario: this.username || 'admin',
          detalles: `Eliminación lógica de venta #${itemToDelete.idcorrelativo} | Precisión: ${geoData.precision} | ISP: ${geoData.isp} | Exactitud: ${geoData.accuracy ? Math.round(geoData.accuracy) + 'm' : 'N/A'}`,
          dataprocesada: JSON.stringify({
            ...dataProcesada,
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

        // Registrar auditoría
        await this.api.registrarAuditoria(auditoria).toPromise();

        // Mostrar toast de éxito
        this.showToast('success', 'Venta Eliminada', 'La venta ha sido eliminada y registrada en auditoría');

        // Recargar la página después de 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);

      } catch (error: any) {
        console.error('Error al eliminar venta:', error);
        itemToDelete.eliminando = false;
        this.showToast('error', 'Error al Eliminar', error.error?.message || error.message || 'Error desconocido');
      }
    };
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

  SendDataonChangeProd(event: any) {
    const nombreProducto = event.target.value;
    console.log('Producto seleccionado:', nombreProducto);
    this.productoSeleccionado = nombreProducto;
    this.cargarVentasDiariasProducto(nombreProducto);
  }

  onSelect(event: any) {
    console.log(event);
  }

  exportToExcel(): void {
    const element = document.getElementById('excel-table');
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'ventas-detalle.xlsx');
  }

  // Alias para compatibilidad
  exportexcel(): void {
    this.exportToExcel();
  }

  // Métodos adicionales para gráficos
  onActivate(event: any): void {
    console.log('Activate', event);
  }

  onDeactivate(event: any): void {
    console.log('Deactivate', event);
  }

  // ========== MÉTODOS PARA SISTEMA DE TOASTS ==========

  showToast(type: 'success' | 'error' | 'info' | 'warning', title: string, message: string): void {
    const toast: Toast = {
      id: this.toastIdCounter++,
      type,
      title,
      message
    };

    this.toasts.push(toast);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      this.removeToast(toast);
    }, 5000);
  }

  removeToast(toast: Toast): void {
    const index = this.toasts.findIndex(t => t.id === toast.id);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }

  // ========== MÉTODOS PARA MODAL DE CONFIRMACIÓN ==========

  confirmarAccion(): void {
    this.showConfirmModal = false;
    if (this.confirmCallback) {
      this.confirmCallback();
      this.confirmCallback = null;
    }
    this.confirmModalData = null;
  }

  cancelarAccion(): void {
    this.showConfirmModal = false;
    this.confirmCallback = null;
    this.confirmModalData = null;
  }
}
