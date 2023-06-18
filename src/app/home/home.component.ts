import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { DatePipe } from '@angular/common';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {


  data : any[] = [];
  dataventas : any[] = [];
  dataconsultaventas : any[] = [];

  changed: Date = new Date("2023-01-01");
  pipe = new DatePipe('en-US');
  newDate: string= "";

  constructor(private ApiService: ApiService){}

  ngOnInit(): void{
    this.llenarData();
    this.llenarDataVentas();
  }

  llenarData(){
      this.ApiService.getData().subscribe( data => {
        this.data = data;
        console.log(this.data);
      })
  }

  llenarDataVentas(){
      this.ApiService.getDataVentas().subscribe( dataventas => {
      this.dataventas = dataventas;
      console.log(this.dataventas);
    })
  }

  llenarDataConsultaVentas(sfecha){
    this.ApiService.getDataConsultaVentas(sfecha).subscribe( dataconsultaventas => {
    this.dataconsultaventas = dataconsultaventas;
    console.log(this.dataconsultaventas);
  })
}

  SendDataonChange(event: any) {
    console.log(event.target.value);
    this.llenarDataConsultaVentas(event.target.value);
  }

  changeFormat(changed){
    let ChangedFormat = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
    this.newDate = ChangedFormat;
  }

  onClick() {
    this.changeFormat(this.changed);
    console.log(this.newDate);
  }

}
