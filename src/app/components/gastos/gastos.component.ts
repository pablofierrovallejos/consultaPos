import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Mascota } from "./mascota";
import { Gastos } from "./gastos";
@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export class GastosComponent {
 


  gastosModel = new Gastos(new Date(),"",1,1,"");

  dataconsultagastos: any[] = [];
  pipe = new DatePipe('en-US');

  changed: Date = new Date();
  ChangedFormat='';   
  ChangedFormat2='';
  nombreMesActual: any;



  constructor(private ApiService: ApiService,private router: Router){
   
  }

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ChangedFormat2  = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
    this.llenarDataConsultaCostos(this.ChangedFormat);
    console.log("ngOnInit(): " + this.ChangedFormat);
  }
  onSubmit(customerData) {
    // Process checkout data here
    //this.items = this.cartService.clearCart();


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
    throw new Error('Method not implemented.');
  }
    
  mesSiguiente() {
    throw new Error('Method not implemented.');
  }
  mesAnterior() {
    throw new Error('Method not implemented.');
  }

  llenarDataConsultaCostos(sfecha){
    this.ApiService.getDataConsultaCostos(sfecha).subscribe( dataconsultagastos => {
    this.dataconsultagastos = dataconsultagastos;
    console.log("llenarDataConsultaGastos: " + sfecha);
    })
  }



  formularioEnviado2(){
    console.log("El formulario fue enviado y la mascota es: ", this.gastosModel)
    this.ApiService.setDataConsultaCostos(this.gastosModel).subscribe(
      data=>console.log(data),
      error => console.error('Error:', error)
    );
  }


}
