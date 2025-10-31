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
  ChangedFormatDisplay=''; // Formato DD-MM-YY para mostrar en headers
  datameas: any[] = [];
  datameasMes: any[] = [];
  datamultiMeas: any[] = [];
  totalEnergiaMes: number = 0; // Total de energía consumida en el mes
  totalEnergiaDia: number = 0; // Total de energía consumida en el día
  valorKilowatt: number = 236; // Valor por defecto del kilowatt
  costoDia: number = 0; // Costo total del día en pesos
  costoMes: number = 0; // Costo total del mes en pesos

  changed: Date = new Date();
  nombreMesActual = '';

  changedFecha: Date = new Date();

  pipe = new DatePipe('en-US');
  newDate: string= "";



  constructor(private ApiService: ApiService, private router: Router) {
  }

  ngOnInit(): void{
    this.ChangedFormat = this.pipe.transform(this.changed, 'YY-MM-dd') ?? '';
    this.ChangedFormatDisplay = this.pipe.transform(this.changed, 'dd-MM-yy') ?? ''; // Formato para mostrar
    this.newDate = this.pipe.transform(this.changed, 'dd/MM/yyyy') ?? '';

    // Obtener nombre del mes actual
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.nombreMesActual = meses[this.changed.getMonth()];

    // Obtener valor del kilowatt desde la configuración
    this.cargarValorKilowatt();

    this.llenarDataConsultaMeas(this.ChangedFormat);
    this.llenarDataConsultaMeasMes(this.ChangedFormat);
    this.llenarDataMeasMulti(this.ChangedFormat);
    console.log("ngOnInit(): " + this.ChangedFormat);
  }

     //Para el grafico de tortas
     view: any = undefined; // undefined hace que los gráficos sean responsive
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


  // Método para cargar el valor del kilowatt desde la configuración
  cargarValorKilowatt(): void {
    this.ApiService.obtenerConfiguracion('valorkilowatt').subscribe(
      (config: any) => {
        if (config && config.valor) {
          this.valorKilowatt = parseFloat(config.valor);
          console.log('Valor kilowatt cargado:', this.valorKilowatt);
        }
      },
      error => {
        console.error('Error al cargar valor kilowatt, usando valor por defecto:', error);
        this.valorKilowatt = 180; // Valor por defecto
      }
    );
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
      let nameValue = '';
      if (item.namedia) {
        nameValue = item.namedia;
      } else if (item.name) {
        nameValue = item.name;
      } else {
        nameValue = 'Sin nombre';
      }

      // Intentar formatear como fecha DD-MM-YY si parece una fecha
      result.name = this.formatearFechaEjeX(nameValue);

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

  // Método para formatear fechas del eje X en formato DD-MM-YY
  private formatearFechaEjeX(valor: string): string {
    // Detectar si el valor parece una fecha (formatos comunes del backend)
    // Formatos esperados: YYYY-MM-DD, YY-MM-DD, DD/MM/YYYY, etc.
    const patronFecha = /^(\d{2,4})-(\d{2})-(\d{2})$/; // YYYY-MM-DD o YY-MM-DD
    const patronFecha2 = /^(\d{2})\/(\d{2})\/(\d{4})$/; // DD/MM/YYYY
    
    let match = valor.match(patronFecha);
    if (match) {
      const [_, year, month, day] = match;
      // Si el año tiene 4 dígitos, tomar solo los últimos 2
      const yearShort = year.length === 4 ? year.slice(-2) : year;
      return `${day}-${month}-${yearShort}`;
    }
    
    match = valor.match(patronFecha2);
    if (match) {
      const [_, day, month, year] = match;
      const yearShort = year.slice(-2);
      return `${day}-${month}-${yearShort}`;
    }
    
    // Si no es una fecha reconocible, devolver el valor original
    return valor;
  }

  llenarDataConsultaMeas(sfecha){
    this.ApiService.getDataConsultaMeas(sfecha).subscribe( datameas => {
      this.datameas = this.validateChartData(datameas);
      
      // NO calcular aquí, esperar a que se carguen los datos del mes
      // El cálculo se hará en llenarDataConsultaMeasMes tomando el valor del día actual
      
      console.log("llenarDataConsultaMeas - Datos cargados");
    })
  }
  llenarDataConsultaMeasMes(sfecha){
    this.ApiService.getDataConsultaMeasMes(sfecha).subscribe( datameas => {
      this.datameasMes = this.validateChartData(datameas);
      
      // Calcular el total de energía del mes
      this.totalEnergiaMes = this.datameasMes.reduce((total, item) => {
        return total + (item.value || 0);
      }, 0);
      
      // Calcular costo del mes (Watts a Kilowatts y multiplicar por valor)
      this.costoMes = (this.totalEnergiaMes / 1000) * this.valorKilowatt;
      
      // Obtener el valor del día actual (última barra del gráfico mensual)
      // El último elemento representa el consumo acumulado del día actual
      if (this.datameasMes.length > 0) {
        const ultimoDia = this.datameasMes[this.datameasMes.length - 1];
        this.totalEnergiaDia = ultimoDia.value || 0;
        // Calcular costo del día (valor ya está en Watts, convertir a kW)
        this.costoDia = (this.totalEnergiaDia / 1000) * this.valorKilowatt;
        console.log("Consumo día actual (última barra):", this.totalEnergiaDia, "W =", (this.totalEnergiaDia/1000), "kW, Costo:", this.costoDia);
      }
      
      console.log("llenarDataConsultaMeasMes - Total energía mes:", this.totalEnergiaMes, "Costo mes:", this.costoMes);
    })
  }
  // Método para formatear números con separador de miles y 2 decimales con coma
  formatearNumero(numero: number): string {
    return numero.toLocaleString('es-CL', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Función para formatear los valores de las barras del gráfico
  formatearValorBarra = (value: number): string => {
    return value.toLocaleString('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  llenarDataMeasMulti(sfecha){
    this.ApiService.getDataConsultaMultiMeasMes(sfecha).subscribe( datamultiMeas  => {
      this.datamultiMeas = this.validateChartData(datamultiMeas);
    })
    //console.log("llenarDataMeasMulti: " + this.datamultiMeas);
  }

  iraclientes(){
    this.router.navigate(['/clientes']);
  }

  iragastos(){
    this.router.navigate(['/gastos']);
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
