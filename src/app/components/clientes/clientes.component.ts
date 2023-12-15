import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent {
  dataImagenClientes: any[] = [];

  ngOnInit(): void{
    this.llenarDataImagenClientes();
  }

  constructor(private ApiService: ApiService){
    Object.assign(this, { this:this.dataImagenClientes });
  }



  llenarDataImagenClientes(){
    this.ApiService.getDataConsultaImagenCliente().subscribe( dataImagenClientes => {
      this.dataImagenClientes = dataImagenClientes});
  }
}
