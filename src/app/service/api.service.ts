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

}
