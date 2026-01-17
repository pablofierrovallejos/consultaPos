import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Gastos } from "./gastos";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export class GastosComponent {

  gastosModel = new Gastos(new Date(),"",1,1,"");
  idgastoeliminar: any;
  dataconsultagastos: any[] = [];
  pipe = new DatePipe('en-US');

  changed: Date = new Date();
  ChangedFormat='';
  ChangedFormat2='';
  nombreMesActual: any;

  // URL para el iframe de gastos
  gastosUrl!: SafeResourceUrl;

  constructor(private ApiService: ApiService, private router: Router, private sanitizer: DomSanitizer){

  }

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ChangedFormat2  = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
    this.nombreMesActual = this.obtenerNombreMes(this.ChangedFormat.substring(3,5));

    // Generar URL para iframe de gastos con el mes actual
    this.updateGastosUrl();

    this.llenarDataConsultaCostos(this.ChangedFormat);
    this.registrarAuditoriaConsultaGastos();
    console.log("ngOnInit(): " + this.ChangedFormat);
  }

  async registrarAuditoriaConsultaGastos(): Promise<void> {
    try {
      const geoData = await this.obtenerGeolocalizacion();
      const auditoria = {
        hostorigen: geoData.query || 'localhost',
        modulo: '/gastos',
        accionrealizada: 'Consulta Gastos',
        usuario: 'hp',
        detalles: `Acceso al módulo de gastos | Mes: ${this.nombreMesActual} | Precisión: ${geoData.precision}`,
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
        () => console.log('✅ Auditoría gastos registrada'),
        (error) => console.warn('⚠️ Error auditoría gastos:', error)
      );
    } catch (error) {
      console.error('❌ Error auditoría gastos:', error);
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

  // Método para actualizar la URL de gastos con el mes actual
  updateGastosUrl(): void {
    const currentDate = new Date(this.changed);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const monthParam = `${year}-${month}`;

    const url = `http://35.209.63.29:81/gastos?month=${monthParam}`;
    this.gastosUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

    console.log('URL de gastos actualizada:', url);
  }
  onSubmit(customerData) {
    console.warn('Your order has been submitted', customerData);
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

  ingresargastos() {
    throw new Error('Method not implemented.');
  }
  iragastos() {
    this.router.navigate(['/gastos']);
  }
  
  iraconciliacion() {
    this.router.navigate(['/conciliacion']);
  }

  mesAnterior(){
    this.changed.setMonth(this.changed.getMonth() - 1);
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.updateGastosUrl(); // Actualizar URL del iframe
    this.ngOnInit()  //llamamos a la funcion ngOnInit para que se actualice la pagina
    //alert('click mes anterior' + this.ChangedFormat);
  }

  mesSiguiente(){
    this.changed.setMonth(this.changed.getMonth() + 1);
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.updateGastosUrl(); // Actualizar URL del iframe
    this.ngOnInit()  //llamamos a la funcion ngOnInit para que se actualice la pagina
    //alert('click mes anterior' + this.ChangedFormat);
  }

  llenarDataConsultaCostos(sfecha){
    this.ApiService.getDataConsultaCostos(sfecha).subscribe( dataconsultagastos => {
    this.dataconsultagastos = dataconsultagastos;
    console.log("llenarDataConsultaGastos: " + sfecha);
    })
  }



  formularioEnviado2(){
    console.log("El formulario fue enviado y los gastos son: ", this.gastosModel)
    this.ApiService.setDataConsultaCostos(this.gastosModel).subscribe(
      data=>console.log(data),
      error => console.error('Error:', error)
    );
    this.ngOnInit();
  }

  formularioEnviado3(idcostos: any) {
    this.idgastoeliminar = idcostos;
    this.ApiService.setDataActualizarCostos(this.idgastoeliminar).subscribe(
      data=>console.log("id a eliminar:" + this.idgastoeliminar),
      error => console.error('Error:', error)
    );
    this.ngOnInit();
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



}
