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
    console.log("ngOnInit(): " + this.ChangedFormat);
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
