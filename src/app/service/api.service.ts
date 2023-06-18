import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private urlApi = '/api/productos/listar-productos';
  private urlApiVentas = '/api/productos/listar-ventas';
  private urlApiConsultaVentas = '/api/productos/consultar-ventas/';

  constructor(private http: HttpClient) { }

  public getData(): Observable<any>{
    return this.http.get<any>(this.urlApi);
  }

  public getDataVentas(): Observable<any>{
    return this.http.get<any>(this.urlApiVentas);
  }

  public getDataConsultaVentas(sfecha): Observable<any>{
    return this.http.get<any>(this.urlApiConsultaVentas + sfecha);
  }

}
