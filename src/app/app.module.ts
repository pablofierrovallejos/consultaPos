import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS} from '@angular/common/http'
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatToolbarModule} from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { ClientesComponent } from './components/clientes/clientes.component';
import { EnergiaComponent } from './components/energia/energia.component';
import { ProductosComponent } from './components/productos/productos.component';
import { SpinnerComponent } from './spinner/spinner.component'; // Add this import
import { LoadingInterceptor } from './loading.interceptor';
import { IngresoventaComponent } from './components/ingresoventa/ingresoventa.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ClientesComponent,
    EnergiaComponent,
    ProductosComponent,
    SpinnerComponent,
    IngresoventaComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    NgxChartsModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
