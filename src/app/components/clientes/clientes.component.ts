import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent {
  dataImagenClientes: any[] = [];
  changed: Date = new Date()
  ChangedFormat=''; 
  pipe = new DatePipe('en-US');
  ChangedFormat2='';
  nombreMesActual = ''; 

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ChangedFormat2  = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
    this.nombreMesActual = this.obtenerNombreMes(this.ChangedFormat.substring(3,5));

    this.llenarDataImagenClientes(this.ChangedFormat);
    this.registrarAuditoriaConsultaClientes();
  }

  async registrarAuditoriaConsultaClientes(): Promise<void> {
    try {
      const geoData = await this.obtenerGeolocalizacion();
      const auditoria = {
        hostorigen: geoData.query || 'localhost',
        modulo: '/clientes',
        accionrealizada: 'Consulta Clientes',
        usuario: 'hp',
        detalles: `Acceso al módulo de clientes | Mes: ${this.nombreMesActual} | Precisión: ${geoData.precision}`,
        dataprocesada: JSON.stringify({
          fecha_acceso: new Date().toISOString(),
          url: window.location.href,
          mes_consulta: this.nombreMesActual,
          fecha_consulta: this.ChangedFormat,
          geolocalizacion: { precision: geoData.precision, isp: geoData.isp }
        }),
        latitud: geoData.lat || 0,
        longitud: geoData.lon || 0,
        ciudad: geoData.city || 'Desconocida',
        region: geoData.regionName || 'Desconocida',
        pais: geoData.country || 'Chile'
      };
      this.ApiService.registrarAuditoria(auditoria).subscribe(
        () => console.log('✅ Auditoría clientes registrada'),
        (error) => console.warn('⚠️ Error auditoría clientes:', error)
      );
    } catch (error) {
      console.error('❌ Error auditoría clientes:', error);
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
      // Nota: ipapi.co removido para evitar errores CORS y límites de tasa
      // Se usa solo GPS o datos por defecto
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

  constructor(private ApiService: ApiService,private router: Router){
    Object.assign(this, { this:this.dataImagenClientes });
  }



  llenarDataImagenClientes(sfecha){
    this.ApiService.getDataConsultaImagenCliente2(sfecha).subscribe( dataImagenClientes => {
      this.dataImagenClientes = dataImagenClientes});
  }

  iraclientes(){
    this.router.navigate(['/clientes']);
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


  diaAnterior(){
    this.changed.setDate(this.changed.getDate() - 1);
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ngOnInit()  //llamamos a la funcion ngOnInit para que se actualice la pagina
  }
  diaSiguiente(){
    this.changed.setDate(this.changed.getDate() + 1);
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ngOnInit()  //llamamos a la funcion ngOnInit para que se actualice la pagina
    console.log('this.changed ' + this.changed)
    console.log('this.changed.getDate() ' + this.changed.getDate())
  }

  obtenerNombreMes (numero) {
    console.log('mes nro: '+ numero)
    let miFecha = new Date();
    if (0 < numero && numero <= 12) {
      miFecha.setMonth(numero - 1);
      return this.capitalizeFirstLetter(new Intl.DateTimeFormat('es-ES', { month: 'long'}).format(miFecha));
    } else {
      return '';
    }
  }

  capitalizeFirstLetter(string) {
    return string[0].toUpperCase() + string.slice(1);
  }

  SendDataonChange(event: any) {
    //console.log(event.target.value);
    this.llenarDataImagenClientes(event.target.value);
  }

}
