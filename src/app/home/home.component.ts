import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { DatePipe } from '@angular/common';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import {FormGroup,FormControl,Validators,FormArray} from '@angular/forms';
import {MatToolbarModule} from '@angular/material/toolbar';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = 'localhost:5001'; // URL del microservicio de notificaciones
    const url = `${protocol}//${host}/ws/notificaciones`;

    console.log('Conectando a WebSocket:', url);

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = (event) => {
        console.log('✅ WebSocket conectado exitosamente');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Mensaje recibido:', data);
          
          if (data.tipo === 'ventas') {
            this.mostrarNotificacion(data);
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
    // Guardar datos de la notificación
    this.notificationData = {
      hora: new Date().toLocaleTimeString('es-CL'),
      totalTransacciones: data.total_transacciones || 0,
      montoTotal: data.total_monto || 0
    };

    // Reproducir sonido
    this.reproducirSonido();

    // Mostrar notificación
    this.showNotification = true;

    // Limpiar timeout anterior si existe
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Ocultar después de 5 segundos
    this.notificationTimeout = setTimeout(() => {
      this.showNotification = false;
      this.notificationData = null;
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
      alert('El monto de la venta no es válido');
      return;
    }

    if (!item.idcorrelativo) {
      alert('No se encontró el ID de la venta');
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
      alert('Error al emitir boleta: ' + (error.error?.message || error.message || 'Error desconocido'));
    }
  }

  // Método para ver boleta en ventana emergente
  async verBoleta(item: any): Promise<void> {
    if (!item.numeroFolio || item.numeroFolio === 'N/A') {
      alert('No hay boleta disponible para visualizar');
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
      alert('Error al visualizar boleta: ' + (error.error?.message || error.message || 'Error desconocido'));
    }
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
}
