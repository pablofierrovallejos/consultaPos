import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import { environment } from '../../environments/environment';

//const cors = require('cors')
//const express = require('express')
//const app = express()
//const port = 3000

//app.use(cors())

//app.get('/api/productos/listar-ventas',(req,res)=> {
//  res.send({status: 'Bien'})
//})
//
//app.listen(port, ()=> {
//  console.log('Example listen..')
//})

@Injectable({
  providedIn: 'root'
})

export class ApiService {

  // private baseUrl = "http://microserver:8090"
  //private baseUrl = "http://microserver:30600"
  //private baseUrl = "http://servicio-productos.ventas2.svc.cluster.local:8090" //esto no sirve
  private baseUrl = environment.baseUrl;    //Configuración parametrizable desde environment
  private ventasUrl = environment.ventasUrl;  //URL específica para microservicio de ventas
  private boletasUrl = environment.boletasUrl;  //URL específica para microservicio de boletas
  //  API_URL: '${BACKEND_URL}${BACKEND_PORT}'
  ///const KEY = `${process.env.KEY_TO_READ}`;
  //private baseUrl = '${HOST_BACK}';
  private urlApi = this.baseUrl + '/productos/listar-productos';
  private urlApiVentas = this.baseUrl +'/productos/listar-ventas';
  private urlApiConsultaVentas = this.baseUrl +'/productos/consultar-ventas/';
  private urlApiEstadVentasMes = this.baseUrl +'/productos/cons-estadis-mensual/';
  private urlApiEstadVentasMesProd = this.baseUrl +'/productos/cons-estadis-mensual-por-prod/';
  private urlApiEstadVentasMesProd2 = this.baseUrl +'/productos/cons-estadis-mensual-masvendido-monto/';


  // URLs para los nuevos nodos T163, T221, T77, T26
  private urlconsultaMeas = this.baseUrl +'/energia/consultar-estadistica/';
  private urlconsultaMeasHora = this.baseUrl +'/energia/consultar-measures/'; // Nuevo: múltiples mediciones por hora
  private urlconsultaMeasMes = this.baseUrl +'/energia/consultar-consumo-mes/';
  private urlconsultMultiMeasMes = this.baseUrl +'/energia/consultar-consumo-mes2/';
  private urlconsultaPowerNodo = this.baseUrl +'/energia/consultar-power/';
  private urlconsultaImagenCliente = this.baseUrl +'/productos/consultar-imagencli';
  
  // URLs para temperatura
  private urlTemperaturaUltimas = this.baseUrl + '/energia/temperatura/ultimas/';
  private urlTemperaturaDia = this.baseUrl + '/energia/temperatura/';

  // Lista de nodos disponibles
  nodos: string[] = ['T163', 'T221', 'T77', 'T26'];

  private urlconsultaCostos = this.baseUrl +'/productos/consultar-costos/';
  private urlAbonosTransbank = this.baseUrl +'/abonos/transbank/';
  private urlagregarCostos = this.baseUrl +'/productos/agregar-costos';
  private urlactualizarCostos = this.baseUrl +'/productos/actualizar-costo';


  constructor(private http: HttpClient) { }

  public getData(): Observable<any>{
    return this.http.get(this.urlApi);
  }

  public getDataVentas(): Observable<any>{
    return this.http.get<any>(this.urlApiVentas);
  }

  public getDataConsultaCostos(sfecha): Observable<any>{
    return this.http.get<any>(this.urlconsultaCostos + sfecha);
  }


  public setDataConsultaCostos(dCostos): Observable<any>{
    const headers= new HttpHeaders()
    .set('content-type', 'application/json')
    console.log("#####ssss######");
    let options = { headers: headers };
    return this.http.post(this.urlagregarCostos,  dCostos , options)  ;
  }



  public setDataActualizarCostos(idcosto): Observable<any>{
    const headers= new HttpHeaders()
    .set('content-type', 'application/json')
    console.log("ZZZZZZZZ");
    let options = { headers: headers };
    return this.http.post(this.urlactualizarCostos,  idcosto , options)  ;
  }


  public getDataConsultaVentas(sfecha): Observable<any>{
    return this.http.get<any>(this.urlApiConsultaVentas + sfecha);
  }

  public getEstadisticasVentasMes(sfecha): Observable<any>{
    return this.http.get<any>(this.urlApiEstadVentasMes + sfecha);
  }

  public getEstadisticasVentasMesProd(sfecha, sproducto): Observable<any>{
    return this.http.get<any>(this.urlApiEstadVentasMesProd + sfecha + '/' + sproducto);
  }

  public getEstadisticasVentasMesProd2(sfecha): Observable<any>{
    return this.http.get<any>(this.urlApiEstadVentasMesProd2 + sfecha );
  }

  public getDataConsultaMeas(nodo: string, sfecha: string): Observable<any>{
    return this.http.get<any>(this.urlconsultaMeas + nodo + '/' + sfecha);
  }

  // Nuevo método para obtener múltiples mediciones por hora del día
  public getDataConsultaMeasHora(nodo: string, sfecha: string): Observable<any>{
    return this.http.get<any>(this.urlconsultaMeasHora + nodo + '/' + sfecha);
  }

  public getDataConsultaMeasMes(nodo: string, sfecha: string): Observable<any>{
    return this.http.get<any>(this.urlconsultaMeasMes + nodo + '/' + sfecha);
  }

  public getDataConsultaMultiMeasMes(nodo: string, sfecha: string): Observable<any>{
    return this.http.get<any>(this.urlconsultMultiMeasMes + nodo + '/' + sfecha);
  }

  // Nuevo método para obtener el valor de power actual de un nodo
  public getPowerNodo(nodo: string): Observable<any>{
    // Usar consultar-estadistica con la fecha actual
    const today = new Date();
    const year = today.getFullYear().toString(); // 4 dígitos: 2025
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const fechaStr = `${year}-${month}-${day}`; // Formato: 2025-12-15
    
    return this.http.get<any>(`${this.urlconsultaMeas}${nodo}/${fechaStr}`);
  }

  public getDataConsultaImagenCliente(): Observable<any>{
    return this.http.get<any>(this.urlconsultaImagenCliente);
  }

  public getDataConsultaImagenCliente2(sfecha): Observable<any>{
    return this.http.get<any>(this.urlconsultaImagenCliente + "/" + sfecha);
  }

  // Métodos alias para compatibilidad con HomeComponent
  public getProductos(): Observable<any>{
    return this.getData();
  }

  public getVentas(): Observable<any>{
    return this.getDataVentas();
  }

  public getVentasEstadistica(fecha: string): Observable<any>{
    return this.getEstadisticasVentasMes(fecha);
  }

  public getVentasDia(fecha: string): Observable<any>{
    return this.getDataConsultaVentas(fecha);
  }

  public getVentasEstadisticaProductos(fecha: string): Observable<any>{
    return this.getEstadisticasVentasMesProd2(fecha);
  }

  // Métodos para insertar ventas
  public insertarVenta(venta: any): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(this.ventasUrl + '/productos/insertar-venta', venta, options);
  }

  public insertarDetalleVenta(detalle: any): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(this.ventasUrl + '/productos/insertar-detalleventa', detalle, options);
  }

  // Método para actualizar producto
  public actualizarProducto(producto: any): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(this.baseUrl + '/productos/actualizar-producto', producto, options);
  }

  // Método para agregar nuevo producto
  public agregarProducto(producto: any): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(this.baseUrl + '/productos/agregar-producto', producto, options);
  }

  // Método para emitir boleta con idventa
  public emitirBoleta(idventa: number, monto: number, descripcion: string): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    const body = { idventa, monto, descripcion };
    return this.http.post(this.boletasUrl + '/emitir-boleta', body, options);
  }

  // Método para listar boletas emitidas
  public listarBoletas(): Observable<any>{
    return this.http.get(this.boletasUrl + '/boletas');
  }

  // Método para obtener boletas de una venta específica
  public obtenerBoletasPorVenta(idventa: number): Observable<any>{
    return this.http.get(`${this.boletasUrl}/boletas/consultavta/${idventa}`);
  }

  // Método para obtener información de una boleta específica
  public obtenerBoleta(folio: string): Observable<any>{
    return this.http.get(`${this.boletasUrl}/boleta/${folio}`);
  }

  // Método para descargar PDF de boleta desde BD
  public descargarBoletaPDF(folio: string): Observable<Blob>{
    return this.http.get(`${this.boletasUrl}/boleta/${folio}/pdf`, { responseType: 'blob' });
  }

  // Método para descargar PDF por nombre de archivo
  public descargarBoletaArchivo(filename: string): Observable<Blob>{
    return this.http.get(`${this.boletasUrl}/descargar-boleta/${filename}`, { responseType: 'blob' });
  }

  // Método para obtener configuración por clave
  public obtenerConfiguracion(clave: string): Observable<any>{
    return this.http.get(`${this.baseUrl}/productos/configuracion/${clave}`);
  }

  // Método para eliminar venta
  public eliminarVenta(idcorrelativo: number): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(`${this.baseUrl}/productos/eliminar-venta/${idcorrelativo}`, {}, options);
  }

  // Método para actualizar venta
  public actualizarVenta(venta: any): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(`${this.baseUrl}/productos/actualizar-venta`, venta, options);
  }

  // Método para registrar auditoría
  public registrarAuditoria(auditoria: any): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(`${this.baseUrl}/productos/registrar-auditoria`, auditoria, options);
  }

  // Método para obtener abonos de Transbank
  getAbonosTransbank(mes: string): Observable<any> {
    return this.http.get(this.urlAbonosTransbank + mes);
  }

  // Método para obtener productos disponibles en la máquina vending
  public getProductosDisponibles(): Observable<any>{
    return this.http.get(this.baseUrl + '/productos/productos-disponibles');
  }

  // Método para actualizar producto vending completo
  public actualizarProductoVending(id: number, producto: any): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(`${this.baseUrl}/productos/vending/${id}/actualizar`, producto, options);
  }

  // Método para actualizar imagen de producto vending
  public actualizarImagenVending(id: number, imagen: string): Observable<any>{
    const headers = new HttpHeaders()
      .set('content-type', 'application/json');
    const options = { headers: headers };
    return this.http.post(`${this.baseUrl}/productos/vending/${id}/imagen`, { imagen }, options);
  }

  // ==================== MÉTODOS DE TEMPERATURA ====================
  
  /**
   * Obtiene las últimas N mediciones de temperatura de un nodo
   * @param nombrenodo Nombre del nodo (ej: T110)
   * @param limit Cantidad de mediciones a obtener (default: 10)
   */
  public getTemperaturaUltimas(nombrenodo: string, limit: number = 10): Observable<any>{
    return this.http.get<any>(`${this.urlTemperaturaUltimas}${nombrenodo}?limit=${limit}`);
  }

  /**
   * Obtiene todas las temperaturas de un día específico
   * @param nombrenodo Nombre del nodo (ej: T110)
   * @param fecha Fecha en formato yyyy-MM-dd (ej: 2025-12-28)
   */
  public getTemperaturaDia(nombrenodo: string, fecha: string): Observable<any>{
    return this.http.get<any>(`${this.urlTemperaturaDia}${nombrenodo}/${fecha}`);
  }

}
