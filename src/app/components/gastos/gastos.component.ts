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
ingresargastos() {
throw new Error('Method not implemented.');
}
iragastos() {
throw new Error('Method not implemented.');
}
nombreMesActual: any;
mesSiguiente() {
throw new Error('Method not implemented.');
}
mesAnterior() {
throw new Error('Method not implemented.');
}

  constructor(private ApiService: ApiService,private router: Router){
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
}
