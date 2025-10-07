import { Component } from '@angular/core';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-energia',
  templateUrl: './energia.component.html',
  styleUrls: ['./energia.component.css']
})
export class EnergiaComponent {
  ChangedFormat='';
  datameas: any[] = [];
  datameasMes: any[] = [];
  datamultiMeas: any[] = [];

  changed: Date = new Date();
  nombreMesActual = '';

  changedFecha: Date = new Date();

  pipe = new DatePipe('en-US');
  newDate: string= "";



  constructor(private ApiService: ApiService, private router: Router) {
  }

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.newDate = this.pipe.transform(this.changed, 'dd/MM/yyyy') ?? '';

    this.llenarDataConsultaMeas(this.ChangedFormat);
    this.llenarDataConsultaMeasMes(this.ChangedFormat);
    this.llenarDataMeasMulti(this.ChangedFormat);
    console.log("ngOnInit(): " + this.ChangedFormat);
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

    yAxisLabelMeas='Potencia Watts';
    xAxisLabelMeas='Hora';
    colorSchemeMeas: Color = {
      name: 'myScheme',
      selectable: true,
      group: ScaleType.Linear,
      domain: ['#FF0C00', '#FF0C00', '#FF0C00'],
    };

    showXAxis = true;
    showYAxis = true;
    showXAxisLabel = true;
    showYAxisLabel = true;


         // options
  showXAxis2: boolean = true;
  showYAxis2: boolean = true;
  gradient2: boolean = true;
  showLegend2: boolean = true;
  showXAxisLabel2: boolean = true;
  xAxisLabel2: string = 'Fecha';
  showYAxisLabel2: boolean = true;
  yAxisLabel2: string = 'Energía Kw/Mes';
  legendTitle2: string = 'Meas1: Consu - Meas2: Gen';

  colorScheme3: Color = {
    name: 'myScheme',
    selectable: true,
    group: ScaleType.Linear,
    domain: ['#FF0C00', '#00FF00', '#AAAAAA'],
  };


    onSelect(data): void {
      console.log('Item clicked', JSON.parse(JSON.stringify(data)));
    }

    onActivate(data): void {
      console.log('Activate', JSON.parse(JSON.stringify(data)));
    }

    onDeactivate(data): void {
      console.log('Deactivate', JSON.parse(JSON.stringify(data)));
    }


  // Helper method para validar y limpiar datos de gráficos
  private validateChartData(data: any[], fallbackValue: any = 0): any[] {
    if (!data || !Array.isArray(data)) {
      console.warn('Datos de gráfico inválidos, usando array vacío:', data);
      return [];
    }

    return data.map((item, index) => {
      // Crear el objeto resultado con la estructura correcta para ngx-charts
      const result: any = {};

      // Manejar el campo name: usar 'namedia' si existe, sino 'name'
      if (item.namedia) {
        result.name = item.namedia;
      } else if (item.name) {
        result.name = item.name;
      } else {
        result.name = 'Sin nombre';
      }

      // Manejar el campo value: convertir string a number si es necesario
      if (item.value != null) {
        // Convertir string a number si es necesario
        const numValue = typeof item.value === 'string' ? parseFloat(item.value) : item.value;
        result.value = isNaN(numValue) ? fallbackValue : numValue;
      } else {
        result.value = fallbackValue;
      }

      // Copiar otras propiedades que puedan existir
      Object.keys(item).forEach(key => {
        if (key !== 'namedia' && key !== 'name' && key !== 'value') {
          result[key] = item[key];
        }
      });

      return result;
    });
  }

  llenarDataConsultaMeas(sfecha){
    this.ApiService.getDataConsultaMeas(sfecha).subscribe( datameas => {
    this.datameas = this.validateChartData(datameas);
    //console.log("llenarDataConsultaMeas: ");
    })
  }

  llenarDataConsultaMeasMes(sfecha){
    this.ApiService.getDataConsultaMeasMes(sfecha).subscribe( datameas => {
    this.datameasMes = this.validateChartData(datameas);
    console.log("llenarDataConsultaMeasMes: ");
    })
  }
  llenarDataMeasMulti(sfecha){
    this.ApiService.getDataConsultaMultiMeasMes(sfecha).subscribe( datamultiMeas  => {
      this.datamultiMeas = this.validateChartData(datamultiMeas);
    })
    //console.log("llenarDataMeasMulti: " + this.datamultiMeas);
  }    iraclientes(){
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
