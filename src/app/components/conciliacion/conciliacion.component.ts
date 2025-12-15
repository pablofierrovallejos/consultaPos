import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-conciliacion',
  templateUrl: './conciliacion.component.html',
  styleUrls: ['./conciliacion.component.css']
})
export class ConciliacionComponent implements OnInit {
  
  abonosTransbank: any[] = [];
  error: string = '';
  chartData: any[] = [];
  pieChartData: any[] = [];
  colorScheme: any = {
    domain: ['#3f51b5']
  };
  pieColorScheme: any = {
    domain: ['#2e7d32', '#c62828']
  };
  legendPosition: any = 'below';
  mesActual: Date = new Date();
  mesActualTexto: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.actualizarMesTexto();
    this.cargarAbonosTransbank();
    this.registrarAuditoriaConsultaConciliacion();
  }

  cargarAbonosTransbank(): void {
    this.error = '';
    
    // Obtener mes en formato YYYY-MM
    const mes = `${this.mesActual.getFullYear()}-${String(this.mesActual.getMonth() + 1).padStart(2, '0')}`;
    
    this.apiService.getAbonosTransbank(mes).subscribe(
      (data: any[]) => {
        this.abonosTransbank = data;
        this.generarDatosGrafico();
        this.generarDatosGraficoPie();
        console.log('Abonos Transbank cargados:', data);
      },
      (error) => {
        console.error('Error al cargar abonos Transbank:', error);
        // Usar datos de prueba mientras se implementa el backend
        console.warn('⚠️ Usando datos de prueba - Backend no disponible');
        this.abonosTransbank = this.obtenerDatosPrueba();
        this.generarDatosGrafico();
        this.generarDatosGraficoPie();
        this.error = '';
      }
    );
  }

  generarDatosGrafico(): void {
    this.chartData = this.abonosTransbank.map(abono => ({
      name: abono.fechaAbono,
      value: abono.totalAbonos
    }));
  }

  generarDatosGraficoPie(): void {
    const totalVentas = this.calcularTotalMontoVenta();
    const totalCobros = this.calcularTotalCobroTransbank();
    const total = totalVentas + totalCobros;
    
    const porcentajeVentas = total > 0 ? ((totalVentas / total) * 100).toFixed(1) : '0.0';
    const porcentajeCobros = total > 0 ? ((totalCobros / total) * 100).toFixed(1) : '0.0';
    
    this.pieChartData = [
      { 
        name: `Total Ventas (${porcentajeVentas}%)`, 
        value: totalVentas,
        extra: porcentajeVentas
      },
      { 
        name: `Total Cobros Transbank (${porcentajeCobros}%)`, 
        value: totalCobros,
        extra: porcentajeCobros
      }
    ];
  }

  // Datos de prueba temporales
  private obtenerDatosPrueba(): any[] {
    return [
      {
        id: 1,
        fecha_abono: '2025-12-06T10:30:00',
        monto: 150000.50,
        codigo_comercio: '597020000540',
        cuenta_destino: '12345678',
        banco: 'Banco de Chile',
        estado: 'PROCESADO',
        fecha_creacion: '2025-12-06T10:00:00'
      },
      {
        id: 2,
        fecha_abono: '2025-12-05T15:45:00',
        monto: 250000.00,
        codigo_comercio: '597020000540',
        cuenta_destino: '87654321',
        banco: 'Banco Estado',
        estado: 'PENDIENTE',
        fecha_creacion: '2025-12-05T15:30:00'
      },
      {
        id: 3,
        fecha_abono: '2025-12-04T09:15:00',
        monto: 85000.75,
        codigo_comercio: '597020000540',
        cuenta_destino: '98765432',
        banco: 'Scotiabank',
        estado: 'PROCESADO',
        fecha_creacion: '2025-12-04T09:00:00'
      },
      {
        id: 4,
        fecha_abono: '2025-12-03T14:20:00',
        monto: 320000.00,
        codigo_comercio: '597020000540',
        cuenta_destino: '11223344',
        banco: 'Banco Santander',
        estado: 'ERROR',
        fecha_creacion: '2025-12-03T14:00:00'
      },
      {
        id: 5,
        fecha_abono: '2025-12-02T11:50:00',
        monto: 195000.25,
        codigo_comercio: '597020000540',
        cuenta_destino: '55667788',
        banco: 'Banco de Chile',
        estado: 'PROCESADO',
        fecha_creacion: '2025-12-02T11:30:00'
      }
    ];
  }

  // Métodos de navegación mensual
  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.actualizarMesTexto();
    this.cargarAbonosTransbank();
  }

  mesSiguiente(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.actualizarMesTexto();
    this.cargarAbonosTransbank();
  }

  actualizarMesTexto(): void {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.mesActualTexto = `${meses[this.mesActual.getMonth()]} ${this.mesActual.getFullYear()}`;
  }

  // Método para calcular total mensual
  calcularTotalMensual(): number {
    return this.abonosTransbank.reduce((total, abono) => total + (abono.totalAbonos || 0), 0);
  }

  // Método para calcular total monto venta mensual
  calcularTotalMontoVenta(): number {
    return this.abonosTransbank.reduce((total, abono) => total + (abono.montoVenta || 0), 0);
  }

  // Método para calcular total cobros Transbank
  calcularTotalCobroTransbank(): number {
    return this.abonosTransbank.reduce((total, abono) => {
      const comisiones = abono.comisiones || 0;
      const ivaComisiones = abono.ivaComisiones || 0;
      const montoCobros = abono.montoCobros || 0;
      const ivaCobros = abono.ivaCobros || 0;
      return total + comisiones + ivaComisiones + montoCobros + ivaCobros;
    }, 0);
  }

  // Método para calcular total de una columna específica
  calcularTotalColumna(campo: string): number {
    return this.abonosTransbank.reduce((total, abono) => total + (abono[campo] || 0), 0);
  }

  // Método para formatear montos con separador de miles
  formatearMonto(valor: number): string {
    return Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Métodos de navegación
  iraproductos(): void {
    this.router.navigate(['/productos']);
  }

  iraventas(): void {
    this.router.navigate(['/home']);
  }

  iraenergia(): void {
    this.router.navigate(['/energia']);
  }

  iragastos(): void {
    this.router.navigate(['/gastos']);
  }

  iraconciliacion(): void {
    this.router.navigate(['/conciliacion']);
  }

  // Auditoría
  async registrarAuditoriaConsultaConciliacion(): Promise<void> {
    try {
      const geoData = await this.obtenerGeolocalizacion();
      const auditoria = {
        hostorigen: geoData.query || 'localhost',
        modulo: '/conciliacion',
        accionrealizada: 'Consulta Conciliación',
        usuario: 'hp',
        detalles: `Acceso al módulo de conciliación | Precisión: ${geoData.precision}`,
        dataprocesada: JSON.stringify({
          fecha_acceso: new Date().toISOString(),
          url: window.location.href,
          total_abonos: this.abonosTransbank.length,
          geolocalizacion: { precision: geoData.precision, isp: geoData.isp }
        }),
        latitud: geoData.lat || 0,
        longitud: geoData.lon || 0,
        ciudad: geoData.city || 'Desconocida',
        region: geoData.regionName || 'Desconocida',
        pais: geoData.country || 'Chile'
      };
      this.apiService.registrarAuditoria(auditoria).subscribe(
        () => console.log('✅ Auditoría conciliación registrada'),
        (error) => console.warn('⚠️ Error auditoría conciliación:', error)
      );
    } catch (error) {
      console.error('❌ Error auditoría conciliación:', error);
    }
  }

  async obtenerGeolocalizacion(): Promise<any> {
    let geoData: any = {
      query: 'localhost', lat: -33.4489, lon: -70.6693, city: 'Desconocida',
      regionName: 'Desconocida', country: 'Chile', isp: 'Desconocido',
      timezone: 'America/Santiago', precision: 'low'
    };
    try {
      const posicion = await this.obtenerPosicionGPS();
      if (posicion) {
        geoData.lat = posicion.latitude;
        geoData.lon = posicion.longitude;
        geoData.accuracy = posicion.accuracy;
        geoData.precision = posicion.accuracy < 100 ? 'high' : 'medium';
      }
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        if (ipData && !ipData.error) {
          geoData.query = ipData.ip;
          geoData.isp = ipData.org || 'Desconocido';
          geoData.timezone = ipData.timezone || 'America/Santiago';
          if (geoData.precision === 'low') {
            geoData.lat = ipData.latitude;
            geoData.lon = ipData.longitude;
            geoData.city = ipData.city;
            geoData.regionName = ipData.region;
            geoData.country = ipData.country_name;
            geoData.precision = 'ip-fallback';
          }
        }
      } catch (e) { }
      geoData.timestamp = new Date().toISOString();
      geoData.userAgent = navigator.userAgent;
      geoData.platform = navigator.platform;
      return geoData;
    } catch (error) {
      return geoData;
    }
  }

  private obtenerPosicionGPS(): Promise<any> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      const timeoutId = setTimeout(() => resolve(null), 10000);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        },
        () => { clearTimeout(timeoutId); resolve(null); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }
}
