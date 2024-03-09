import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ClientesComponent } from './components/clientes/clientes.component'; // Add this import
import { EnergiaComponent } from './components/energia/energia.component'; // Add this import
import { ProductosComponent } from './components/productos/productos.component'; // Add this import
const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: '', component: HomeComponent },
  { path: 'clientes', component: ClientesComponent },
  { path: 'energia', component: EnergiaComponent },
  { path: 'productos', component: ProductosComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
