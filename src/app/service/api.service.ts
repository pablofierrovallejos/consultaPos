import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

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

  private urlApi = 'http://microserver:8090/api/productos/listar-productos';
  private urlApiVentas = 'http://microserver:8090/api/productos/listar-ventas';
  private urlApiConsultaVentas = 'http://microserver:8090/api/productos/consultar-ventas/';
  private urlApiEstadVentasMes = 'http://microserver:8090/api/productos/cons-estadis-mensual/';
  private urlApiEstadVentasMesProd = 'http://microserver:8090/api/productos/cons-estadis-mensual-por-prod/';
  private urlApiEstadVentasMesProd2 = 'http://microserver:8090/api/productos/cons-estadis-mensual-masvendido-monto/';
  

  private urlconsultaMeas = 'http://microserver:8090/api/energia/consultar-estadistica/Meas1/';
  private urlconsultaMeasMes = 'http://microserver:8090/api/energia/consultar-consumo-mes/Meas1/';

  private urlconsultMultiMeasMes = 'http://microserver:8090/api/energia/consultar-consumo-mes2/Meas1/';
  private urlconsultaImagenCliente = 'http://microserver:8090/api/productos/consultar-imagencli';

  constructor(private http: HttpClient) { }

  public getData(): Observable<any>{
    return this.http.get(this.urlApi);
  }

  public getDataVentas(): Observable<any>{
    return this.http.get<any>(this.urlApiVentas);
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


}
