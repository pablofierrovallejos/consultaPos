import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { DatePipe } from '@angular/common';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import {FormGroup,FormControl,Validators,FormArray} from '@angular/forms';
import {MatToolbarModule} from '@angular/material/toolbar';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {


  dataProductos : any[] = [];
  dataventas : any[] = [];
  dataconsultaventas : any[] = [];
  dataestadistica: any[] = [];

  changed: Date = new Date();

  pipe = new DatePipe('en-US');
  newDate: string= "";

  constructor(private ApiService: ApiService){
   // Object.assign(this, { this:this.dataestadistica });
   Object.assign(this, { this:this.dataestadistica });
  }

  ngOnInit(): void{
    this.llenarDataProductos();
    let ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.llenarDataConsultaVentas(ChangedFormat);
    this.llenarEstadisticaMes(ChangedFormat)
    console.log("ngOnInit(): " + ChangedFormat);
  }

  llenarDataProductos(){
      this.ApiService.getData().subscribe( dataProductos => {
        this.dataProductos = dataProductos;
      })
      console.log("llenarDataProductos: " + this.dataProductos);
  }

  llenarDataVentas(){
      this.ApiService.getDataVentas().subscribe( dataventas => {
      this.dataventas = dataventas;
      console.log("llenarDataVentas: " + this.dataventas);
    })
  }

  llenarDataConsultaVentas(sfecha){
    this.ApiService.getDataConsultaVentas(sfecha).subscribe( dataconsultaventas => {
    this.dataconsultaventas = dataconsultaventas;
    console.log("llenarDataConsultaVentas: " + sfecha);
    })
  }

  llenarEstadisticaMes(sfecha){
    this.ApiService.getEstadisticasVentasMes(sfecha).subscribe( dataestadistica => {
    this.dataestadistica = dataestadistica;
    console.log("llenarEstadisticaMes: " + sfecha);
    console.log(this.dataestadistica);
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
    console.log("onClick: " + this.newDate);
  }

   //Para el grafico de tortas
   view: [number, number] = [1200, 500];
   gradient: boolean = false;
   showLegend: boolean = false;
   showLabels: boolean = true;
   isDoughnut: boolean = true;
   legendPosition: string = 'below';
   label: string = "Total ventas mes en pesos";
   animations: boolean = true;
   colorScheme: Color = {
    name: 'myScheme',
    selectable: true,
    group: ScaleType.Linear,
    domain: ['#3371FF', '#3371FF', '#3371FF'],
  };

    //Para el gráfico de barras
    // options
    showXAxis = true;
    showYAxis = true;
    //gradient = false;
    //showLegend = true;
    showXAxisLabel = true;
    xAxisLabel = 'Días del mes';
    showYAxisLabel = true;
    yAxisLabel = 'Monto en pesos $';
    showDataLabel = true;
    legend = false;

   onSelect(data): void {
     console.log('Item clicked', JSON.parse(JSON.stringify(data)));
   }

   onActivate(data): void {
     console.log('Activate', JSON.parse(JSON.stringify(data)));
   }

   onDeactivate(data): void {
     console.log('Deactivate', JSON.parse(JSON.stringify(data)));
   }


}


