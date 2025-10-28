import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})


export class ProductosComponent {
  dataProductos : any[] = [];

  // Variables para el modal de edición
  mostrarModal: boolean = false;
  productoEditando: any = null;
  modoEdicion: boolean = true; // true = editar, false = nuevo

  // Mensajes de alerta
  mostrarMensaje: boolean = false;
  mensajeTexto: string = '';
  mensajeTipo: 'success' | 'error' = 'success';

  constructor(private ApiService: ApiService, private router: Router){
  }



  ngOnInit(): void{
    this.llenarDataProductos();
    console.log("ngOnInit(): ");
  }


  llenarDataProductos(){
    this.ApiService.getData().subscribe( dataProductos => {
      this.dataProductos = dataProductos;
    })
  }

  iraclientes(){
    this.router.navigate(['/clientes']);
  }
  iraenergia(){
    this.router.navigate(['/energia']);
  }
  iragastos(){
    this.router.navigate(['/gastos']);
  }
  iraproductos(){
    this.router.navigate(['/productos']);
  }

  iraventas(){
    this.router.navigate(['/home']);
  }

  abrirModalEditar(producto: any): void {
    // Crear una copia del producto para editar
    this.productoEditando = { ...producto };
    this.modoEdicion = true;
    this.mostrarModal = true;
  }

  abrirModalNuevo(): void {
    // Crear producto vacío con valores por defecto
    const hoy = new Date().toISOString().split('T')[0];
    this.productoEditando = {
      idproductos: null,
      nombreproducto: '',
      precio: 0,
      fechacreacion: hoy,
      estado: 'ACTIVO',
      nroposicion: 0,
      cantidaddisponible: 0
    };
    this.modoEdicion = false;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.productoEditando = null;
  }

  onOverlayMouseDown(event: MouseEvent): void {
    // Solo cerrar si el click es directamente en el overlay, no en el contenido
    if (event.target === event.currentTarget) {
      this.cerrarModal();
    }
  }

  guardarProducto(): void {
    if (!this.productoEditando) return;

    // Validaciones básicas
    if (!this.productoEditando.nombreproducto || this.productoEditando.nombreproducto.trim() === '') {
      this.mostrarMensajeAlerta('El nombre del producto es requerido', 'error');
      return;
    }

    if (this.productoEditando.precio < 0) {
      this.mostrarMensajeAlerta('El precio debe ser mayor o igual a 0', 'error');
      return;
    }

    if (this.modoEdicion) {
      // EDITAR producto existente
      const productoActualizar = {
        idproductos: this.productoEditando.idproductos,
        nombreproducto: this.productoEditando.nombreproducto,
        precio: Number(this.productoEditando.precio),
        fechacreacion: this.productoEditando.fechacreacion,
        estado: this.productoEditando.estado,
        nroposicion: Number(this.productoEditando.nroposicion),
        cantidaddisponible: Number(this.productoEditando.cantidaddisponible)
      };

      console.log('Actualizando producto:', productoActualizar);

      this.ApiService.actualizarProducto(productoActualizar).subscribe(
        (response) => {
          console.log('Producto actualizado:', response);
          this.mostrarMensajeAlerta('Producto actualizado exitosamente', 'success');
          this.cerrarModal();
          this.llenarDataProductos(); // Recargar la tabla
        },
        (error) => {
          console.error('Error al actualizar producto:', error);
          this.mostrarMensajeAlerta('Error al actualizar el producto', 'error');
        }
      );
    } else {
      // AGREGAR nuevo producto
      const productoNuevo = {
        nombreproducto: this.productoEditando.nombreproducto,
        precio: Number(this.productoEditando.precio),
        fechacreacion: this.productoEditando.fechacreacion,
        estado: this.productoEditando.estado,
        nroposicion: Number(this.productoEditando.nroposicion),
        cantidaddisponible: Number(this.productoEditando.cantidaddisponible)
      };

      console.log('Agregando nuevo producto:', productoNuevo);

      this.ApiService.agregarProducto(productoNuevo).subscribe(
        (response) => {
          console.log('Producto agregado:', response);
          this.mostrarMensajeAlerta('Producto agregado exitosamente', 'success');
          this.cerrarModal();
          this.llenarDataProductos(); // Recargar la tabla
        },
        (error) => {
          console.error('Error al agregar producto:', error);
          this.mostrarMensajeAlerta('Error al agregar el producto', 'error');
        }
      );
    }
  }

  mostrarMensajeAlerta(texto: string, tipo: 'success' | 'error'): void {
    this.mensajeTexto = texto;
    this.mensajeTipo = tipo;
    this.mostrarMensaje = true;

    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
      this.mostrarMensaje = false;
    }, 3000);
  }

  cerrarMensajeAlerta(): void {
    this.mostrarMensaje = false;
  }

}
