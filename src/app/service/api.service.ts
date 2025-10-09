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
  //  API_URL: '${BACKEND_URL}${BACKEND_PORT}'
  ///const KEY = `${process.env.KEY_TO_READ}`;
  //private baseUrl = '${HOST_BACK}';
  private urlApi = this.baseUrl + '/productos/listar-productos';
  private urlApiVentas = this.baseUrl +'/productos/listar-ventas';
  private urlApiConsultaVentas = this.baseUrl +'/productos/consultar-ventas/';
  private urlApiEstadVentasMes = this.baseUrl +'/productos/cons-estadis-mensual/';
  private urlApiEstadVentasMesProd = this.baseUrl +'/productos/cons-estadis-mensual-por-prod/';
  private urlApiEstadVentasMesProd2 = this.baseUrl +'/productos/cons-estadis-mensual-masvendido-monto/';


  private urlconsultaMeas = this.baseUrl +'/energia/consultar-estadistica/Meas1/';
  private urlconsultaMeasMes = this.baseUrl +'/energia/consultar-consumo-mes/Meas1/';

  private urlconsultMultiMeasMes = this.baseUrl +'/energia/consultar-consumo-mes2/Meas1/';
  private urlconsultaImagenCliente = this.baseUrl +'/productos/consultar-imagencli';

  private urlconsultaCostos = this.baseUrl +'/productos/consultar-costos/';
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

  public getDataConsultaMeas(sfecha): Observable<any>{
    return this.http.get<any>(this.urlconsultaMeas + sfecha);
  }

  public getDataConsultaMeasMes(sfecha): Observable<any>{
    return this.http.get<any>(this.urlconsultaMeasMes + sfecha);
  }

  public getDataConsultaMultiMeasMes(sfecha): Observable<any>{
    return this.http.get<any>(this.urlconsultMultiMeasMes + sfecha);
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

}
