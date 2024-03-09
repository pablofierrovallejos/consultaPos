import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})


export class ProductosComponent {
  dataProductos : any[] = [];

  constructor(private ApiService: ApiService, private router: Router){
  }


 
  ngOnInit(): void{
    this.llenarDataProductos();
    console.log("ngOnInit(): ");
  }


  llenarDataProductos(){
    this.ApiService.getData().subscribe( dataProductos => {
      this.dataProductos = dataProductos;
    })
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
