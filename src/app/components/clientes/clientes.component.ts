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
