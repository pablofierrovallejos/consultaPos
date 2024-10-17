import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export class GastosComponent {

dataconsultagastos: any[] = [];
pipe = new DatePipe('en-US');

changed: Date = new Date();
ChangedFormat='';   
ChangedFormat2='';
nombreMesActual: any;

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

  constructor(private ApiService: ApiService,private router: Router){}

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ChangedFormat2  = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
   // this.nombreMesActual = this.obtenerNombreMes(this.ChangedFormat.substring(3,5));


   
    this.llenarDataConsultaCostos(this.ChangedFormat);

    console.log("ngOnInit(): " + this.ChangedFormat);
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

  llenarDataConsultaCostos(sfecha){
    this.ApiService.getDataConsultaCostos(sfecha).subscribe( dataconsultagastos => {
    this.dataconsultagastos = dataconsultagastos;
    console.log("llenarDataConsultaGastos: " + sfecha);
    })
  }

}
