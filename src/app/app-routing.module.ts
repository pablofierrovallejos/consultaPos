import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ClientesComponent } from './components/clientes/clientes.component'; // Add this import
import { EnergiaComponent } from './components/energia/energia.component'; // Add this import
import { ProductosComponent } from './components/productos/productos.component'; // Add this import
import { IngresoventaComponent } from './components/ingresoventa/ingresoventa.component'; // Add this import
import { GastosComponent } from './components/gastos/gastos.component'; // Add this import
import { ConciliacionComponent } from './components/conciliacion/conciliacion.component'; // Add this import
import { ProductosVendingComponent } from './components/productos-vending/productos-vending.component'; // Add this import
const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: '', component: HomeComponent },
  { path: 'clientes', component: ClientesComponent },
  { path: 'energia', component: EnergiaComponent },
  { path: 'productos', component: ProductosComponent },
  { path: 'productos-vending', component: ProductosVendingComponent },
  { path: 'ingresoventa', component: IngresoventaComponent },
  { path: 'gastos', component: GastosComponent },
  { path: 'conciliacion', component: ConciliacionComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
