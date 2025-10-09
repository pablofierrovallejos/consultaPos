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

  // Propiedades de autenticación
  isAuthenticated: boolean = false;
  username: string = '';
  password: string = '';
  loginError: string = '';
  
  // Credenciales válidas
  private readonly validUsername = 'hp';
  private readonly validPassword = 'hp';
  private readonly authCookieName = 'consultaPos_auth';

  dataProductos : any[] = [];
  dataventas : any[] = [];
  dataestadistica: any[] = [];
  dataconsultaventas: any[] = [];
  dataestadisticaVentasProd: any[] = [];
  dataestadisticaProd: any[] = [];

  // Propiedades para totales
  totalMonto: number = 0;
  totalTarjeta: number = 0;

  // Propiedades adicionales para gráficos
  label: string = 'Porcentaje';
  animations: boolean = true;
  y_etiquetaVtaDiariaCant: string = 'Cantidad';
  showXAxisLabelVMP: string = 'Productos';

  nombreMesActual = "";
  nombreMesAnterior = "";
  nombreMesSiguiente = "";
  MesActual= "";
  fecha = new Date();
  changed : any;
  ChangedFormat: any;
  ChangedFormat2: any;
  MesActualFormat: any;
  mesActualparaProductos:any;

  // Propiedades para los gráficos
  view: [number, number] = [800, 500];
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Días';
  showYAxisLabel = true;
  yAxisLabel = 'Importe';
  showDataLabel = true;
  xAxisLabelVMP='Productos';
  
  colorSchemeBar: Color = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0']
  };

  constructor(private api: ApiService, private router: Router) {
    // Verificar autenticación al cargar
    this.checkAuthenticationStatus();
  }

  ngOnInit(): void {
    if (this.isAuthenticated) {
      this.loadDashboardData();
    }
  }

  // Método para verificar el estado de autenticación
  checkAuthenticationStatus(): void {
    const authCookie = this.getCookie(this.authCookieName);
    this.isAuthenticated = authCookie === 'authenticated';
  }

  // Método para cargar datos del dashboard
  loadDashboardData(): void {
    this.getProductos();
    this.getVentas();
    this.getVentasEstadistica();
    this.getVentasDia();
    this.getVentasEstadisticaProductos();
  }

  // Método de login
  login(): void {
    this.loginError = '';
    
    if (this.username === this.validUsername && this.password === this.validPassword) {
      this.isAuthenticated = true;
      this.setCookie(this.authCookieName, 'authenticated', 30); // Cookie válida por 30 días
      this.loadDashboardData();
      this.username = '';
      this.password = '';
    } else {
      this.loginError = 'Usuario o contraseña incorrectos';
      this.password = ''; // Limpiar solo la contraseña
    }
  }
  
  // Método de logout
  logout(): void {
    this.isAuthenticated = false;
    this.deleteCookie(this.authCookieName);
    this.username = '';
    this.password = '';
    this.loginError = '';
  }

  // Utilidades para cookies
  setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }

  getCookie(name: string): string {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return '';
  }

  deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // Método para validar datos del gráfico
  validateChartData(data: any[]): any[] {
    return data.map(item => ({
      name: item.namedia || item.name || 'Sin nombre',
      value: typeof item.value === 'string' ? parseFloat(item.value) || 0 : item.value || 0
    }));
  }

  getProductos(){
    this.api.getProductos().subscribe((data: any) => {
      this.dataProductos = data;
    });
  }

  getVentas(){
    this.api.getVentas().subscribe((data: any) => {
      this.dataventas = data;
    });
  }

  getVentasEstadistica(){
    // Enviar fecha completa (primer día del mes) para el SP
    this.MesActual = this.fecha.getFullYear()+"-"+(this.fecha.getMonth()+1).toString().padStart(2,'0')+"-01";
    this.nombreMesActual = this.obtenerNombreMes(this.fecha.getMonth());
    this.MesActualFormat = this.MesActual;
    
    this.api.getVentasEstadistica(this.MesActual).subscribe((data: any) => {
      console.log('Datos recibidos de estadística:', data);
      this.dataestadistica = this.validateChartData(data);
      console.log('Datos validados para gráfico:', this.dataestadistica);
    });
  }

  getVentasDia(){
    this.changed = this.fecha.getFullYear()+"-"+(this.fecha.getMonth()+1).toString().padStart(2,'0')+"-"+this.fecha.getDate().toString().padStart(2,'0');
    this.ChangedFormat = this.changed;
    this.ChangedFormat2 = this.fecha.getDate().toString().padStart(2,'0');
    
    this.api.getVentasDia(this.changed).subscribe((data: any) => {
      this.dataconsultaventas = data;
    });
  }

  getVentasEstadisticaProductos(){
    // Enviar fecha completa (primer día del mes) para el SP
    this.mesActualparaProductos = this.fecha.getFullYear()+"-"+(this.fecha.getMonth()+1).toString().padStart(2,'0')+"-01";
    
    this.api.getVentasEstadisticaProductos(this.mesActualparaProductos).subscribe((data: any) => {
      console.log('Datos recibidos de productos:', data);
      this.dataestadisticaVentasProd = this.validateChartData(data);
      console.log('Datos validados para gráfico productos:', this.dataestadisticaVentasProd);
    });
  }

  iraproductos(){
    this.router.navigate(['/productos']);
  }

  iraventas(){
    this.router.navigate(['/ingresoventa']);
  }

  iraenergia(){
    this.router.navigate(['/energia']);
  }

  iraclientes(){
    this.router.navigate(['/clientes']);
  }

  iragastos(){
    this.router.navigate(['/gastos']);
  }

  mesAnterior(){
    this.fecha.setMonth(this.fecha.getMonth()-1);
    this.getVentasEstadistica();
    this.getVentasEstadisticaProductos();
  }

  mesSiguiente(){
    this.fecha.setMonth(this.fecha.getMonth()+1);
    this.getVentasEstadistica();
    this.getVentasEstadisticaProductos();
  }

  diaAnterior(){
    this.fecha.setDate(this.fecha.getDate()-1);
    this.getVentasDia();
  }

  diaSiguiente(){
    this.fecha.setDate(this.fecha.getDate()+1);
    this.getVentasDia();
  }

  obtenerNombreMes(mes: number): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes];
  }

  SendDataonChange(event: any) {
    this.ChangedFormat = event.target.value;
    this.changed = event.target.value;
    const fechaSeleccionada = new Date(event.target.value + 'T00:00:00');
    this.ChangedFormat2 = fechaSeleccionada.getDate().toString().padStart(2,'0');
    
    this.api.getVentasDia(this.changed).subscribe((data: any) => {
      this.dataconsultaventas = data;
    });
  }

  SendDataonChangeProd(event: any) {
    console.log(event.target.value);
  }

  onSelect(event: any) {
    console.log(event);
  }

  exportToExcel(): void {
    const element = document.getElementById('excel-table');
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'ventas-detalle.xlsx');
  }

  // Alias para compatibilidad
  exportexcel(): void {
    this.exportToExcel();
  }

  // Métodos adicionales para gráficos
  onActivate(event: any): void {
    console.log('Activate', event);
  }

  onDeactivate(event: any): void {
    console.log('Deactivate', event);
  }
}