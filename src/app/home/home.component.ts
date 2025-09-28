import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { DatePipe } from '@angular/common';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import {FormGroup,FormControl,Validators,FormArray} from '@angular/forms';
import {MatToolbarModule} from '@angular/material/toolbar';
import * as XLSX from 'xlsx'; 
import { Router } from '@angular/router';

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
  dataestadisticaProd: any[] = [];
  dataestadisticaVentasProd:  any[] = [];

  datameas: any[] = [];
  datameasMes: any[] = [];
  datamultiMeas: any[] = [];

  changed: Date = new Date();
  ChangedFormat='';   
  ChangedFormat2='';
  nombreMesActual = ''; 

  changedFecha: Date = new Date();

  pipe = new DatePipe('en-US');
  newDate: string= "";
  
 
  totalMonto :number=0;
  totalTarjeta:number=0;
 
  /*name of the excel-file which will be downloaded. */ 
  fileName= 'ExcelSheet.xlsx';


  constructor(private ApiService: ApiService, private router: Router){
   // Object.assign(this, { this:this.dataestadistica });
   Object.assign(this, { this:this.dataestadistica });
  }

  

  
  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ChangedFormat2  = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
    this.nombreMesActual = this.obtenerNombreMes(this.ChangedFormat.substring(3,5));

    this.llenarDataVentas();
    this.llenarDataProductos();
   
    this.llenarDataConsultaVentas(this.ChangedFormat);
    this.llenarEstadisticaMes(this.ChangedFormat);
    this.llenarEstadisticaMesProd(this.ChangedFormat,'Soft Simple');

    this.llenarEstadisticaVentasMesProd(this.ChangedFormat);
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

  iragastos() {
    this.router.navigate(['/gastos']);
  }


  ingresarventa(){
    this.router.navigate(['/ingresoventa']);
  }

  exportexcel(): void 
  {
     /* table id is passed over here */   
     let element = document.getElementById('excel-table'); 
     const ws: XLSX.WorkSheet =XLSX.utils.table_to_sheet(element);

     /* generate workbook and add the worksheet */
     const wb: XLSX.WorkBook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

     /* save to file */
     XLSX.writeFile(wb, this.fileName);
    
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

  mesAnterior(){
    this.changed.setMonth(this.changed.getMonth() - 1);
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ngOnInit()  //llamamos a la funcion ngOnInit para que se actualice la pagina
    //alert('click mes anterior' + this.ChangedFormat);
  }

  mesSiguiente(){
    this.changed.setMonth(this.changed.getMonth() + 1);
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ngOnInit()  //llamamos a la funcion ngOnInit para que se actualice la pagina
    //alert('click mes anterior' + this.ChangedFormat);
  }

  // Helper method para validar y limpiar datos de gráficos
  private validateChartData(data: any[], fallbackValue: any = 0): any[] {
    if (!data || !Array.isArray(data)) {
      console.warn('Datos de gráfico inválidos, usando array vacío:', data);
      return [];
    }
    
    return data.map(item => ({
      ...item,
      value: item.value ?? fallbackValue,
      name: item.name ?? 'Sin nombre'
    }));
  }

  llenarDataMeasMulti(sfecha){
    this.ApiService.getDataConsultaMultiMeasMes(sfecha).subscribe( datamultiMeas  => {
      this.datamultiMeas = this.validateChartData(datamultiMeas);
    })
    //console.log("llenarDataMeasMulti: " + this.datamultiMeas);
  }


  llenarDataProductos(){
      this.ApiService.getData().subscribe( dataProductos => {
        this.dataProductos = dataProductos;
      })
      //console.log("llenarDataProductos: " + this.dataProductos);
  }

  llenarDataVentas(){
      this.ApiService.getDataVentas().subscribe( dataventas => {
      this.dataventas = dataventas;
      //console.log("llenarDataVentas: " + this.dataventas);
    })
  }

  llenarDataConsultaVentas(sfecha){
    this.ApiService.getDataConsultaVentas(sfecha).subscribe( dataconsultaventas => {
    
    // Validar que los datos sean un array válido
    if (dataconsultaventas && Array.isArray(dataconsultaventas)) {
      this.dataconsultaventas = dataconsultaventas.map(item => ({
        ...item,
        subtotalventa: item.subtotalventa ?? 0,
        tipopago: item.tipopago ?? 'EFECTIVO'
      }));

      //Calculamos el TOTAL 
      this.totalMonto = this.dataconsultaventas.reduce( function (acc, obj) { 
        return acc + (obj.subtotalventa ?? 0); 
      }, 0);

      this.totalTarjeta = this.dataconsultaventas.reduce(function (acc, obj) {
        if (obj.tipopago === 'TARJETA') {
          return acc + (obj.subtotalventa ?? 0);
        } else {
          return acc;
        }
      }, 0);

      console.log("Total: "+  this.totalMonto + ' largo:' + this.dataconsultaventas.length);
    } else {
      console.warn('Datos de ventas inválidos:', dataconsultaventas);
      this.dataconsultaventas = [];
      this.totalMonto = 0;
      this.totalTarjeta = 0;
    }
    
    console.log("llenarDataConsultaVentas: " + sfecha);
    })
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

  

  llenarEstadisticaMes(sfecha){
    this.ApiService.getEstadisticasVentasMes(sfecha).subscribe( dataestadistica => {
    this.dataestadistica = this.validateChartData(dataestadistica);
    //console.log("llenarEstadisticaMes: " + sfecha);
    //console.log(this.dataestadistica);
    })
  }

  llenarEstadisticaMesProd(sfecha, sProd){
    this.ApiService.getEstadisticasVentasMesProd(sfecha, sProd).subscribe( dataestadisticaProd => {
    this.dataestadisticaProd = this.validateChartData(dataestadisticaProd);
    //console.log("llenarEstadisticaMesProd: " + sfecha + ' ' + sProd);
    //console.log(this.dataestadisticaProd);
    })
  }

  static ordenarAsc(p_array_json, p_key) {
    p_array_json.sort(function (a, b) {
      // Manejar valores undefined o null
      const aVal = a[p_key] ?? 0;
      const bVal = b[p_key] ?? 0;
      
      // Devolver -1, 0, o 1 para el sort
      if (aVal > bVal) {
        return 1;  // a va después de b
      } else if (aVal < bVal) {
        return -1; // a va antes de b
      } else {
        return 0;  // son iguales
      }
    });
    return p_array_json; // Devolver el array ordenado
  }

 
  llenarEstadisticaVentasMesProd(sfecha){
      //console.log("getEstadisticasVentasMesProd2: " + sfecha );

      this.ApiService.getEstadisticasVentasMesProd2(sfecha).subscribe( dataestadisticaVentasProd => {
      
      //console.log(dataestadisticaVentasProd);
      
      // Validar y limpiar datos antes de asignar
      if (dataestadisticaVentasProd && Array.isArray(dataestadisticaVentasProd)) {
        this.dataestadisticaVentasProd = dataestadisticaVentasProd.map(item => ({
          ...item,
          value: item.value ?? 0,  // Asegurar que value no sea undefined
          name: item.name ?? 'Sin nombre'  // Asegurar que name no sea undefined
        }));
        
        HomeComponent.ordenarAsc(this.dataestadisticaVentasProd, 'value');
      } else {
        console.warn('Datos inválidos recibidos del API:', dataestadisticaVentasProd);
        this.dataestadisticaVentasProd = [];
      }
    })
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
    this.llenarDataConsultaVentas(event.target.value);
  }

  SendDataonChangeProd(event: any) {
    let ChangedFormat = this.pipe.transform(this.changedFecha, 'YY-MM-dd') ?? '';
    this.llenarEstadisticaMesProd(ChangedFormat, event.target.value);
  }


  changeFormat(changed){
    let ChangedFormat = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
    this.newDate = ChangedFormat;
  }
  changeFormat2(changed){
    let ChangedFormat2 = this.pipe.transform(this.changed, 'dd/MM/YYYY') ?? '';
    this.newDate = ChangedFormat2;
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
    showXAxisLabelVMP='Producto';
    xAxisLabel = 'Días del mes';
    showYAxisLabel = true;
    yAxisLabel = 'Monto en pesos $';
    showDataLabel = true;
    legend = false;
    gradientBar: boolean = false;
    colorSchemeBar: Color = {
      name: 'myScheme',
      selectable: true,
      group: ScaleType.Linear,
      domain: ['#2AB80D', '#2AB80D', '#2AB80D'],
    };


    y_etiquetaVtaDiariaCant='Unidades Vendidas'

    yAxisLabelMeas='Potencia Watts';
    xAxisLabelMeas='Hora';
    colorSchemeMeas: Color = {
      name: 'myScheme',
      selectable: true,
      group: ScaleType.Linear,
      domain: ['#FF0C00', '#FF0C00', '#FF0C00'],
    };

    colorScheme2 = {
      domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
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

}


