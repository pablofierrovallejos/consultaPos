import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-productos-vending',
  templateUrl: './productos-vending.component.html',
  styleUrls: ['./productos-vending.component.css']
})
export class ProductosVendingComponent implements OnInit {
  dataProductosDisponibles: any[] = [];
  
  // Variables para el modal de edición
  mostrarModal: boolean = false;
  productoEditando: any = null;
  imagenPreview: string | null = null;
  archivoImagen: File | null = null;
  
  // Mensajes de alerta
  mostrarMensaje: boolean = false;
  mensajeTexto: string = '';
  mensajeTipo: 'success' | 'error' = 'success';

  constructor(private ApiService: ApiService, private router: Router) { }

  ngOnInit(): void {
    this.cargarProductosDisponibles();
  }

  cargarProductosDisponibles(): void {
    this.ApiService.getProductosDisponibles().subscribe(
      (data) => {
        this.dataProductosDisponibles = data;
        console.log('Productos disponibles cargados:', data);
      },
      (error) => {
        console.error('Error al cargar productos disponibles:', error);
        this.mostrarMensajeAlerta('Error al cargar productos disponibles de la máquina', 'error');
      }
    );
  }

  recargarProductos(): void {
    this.cargarProductosDisponibles();
    this.mostrarMensajeAlerta('Productos recargados exitosamente', 'success');
  }

  iraproductos(): void {
    this.router.navigate(['/productos']);
  }

  iraventas(): void {
    this.router.navigate(['/home']);
  }

  iraenergia(): void {
    this.router.navigate(['/energia']);
  }

  iragastos(): void {
    this.router.navigate(['/gastos']);
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

  abrirModalEditar(producto: any): void {
    this.productoEditando = { ...producto };
    this.imagenPreview = producto.imagen && producto.imagen.startsWith('data:image') ? producto.imagen : null;
    this.archivoImagen = null;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.productoEditando = null;
    this.imagenPreview = null;
    this.archivoImagen = null;
  }

  onOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrarModal();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.archivoImagen = file;
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.mostrarMensajeAlerta('Por favor selecciona un archivo de imagen válido', 'error');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.mostrarMensajeAlerta('La imagen no debe superar los 5MB', 'error');
        return;
      }

      // Generar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  guardarProducto(): void {
    if (!this.productoEditando) return;

    // Validaciones básicas
    if (!this.productoEditando.nombre || this.productoEditando.nombre.trim() === '') {
      this.mostrarMensajeAlerta('El nombre del producto es requerido', 'error');
      return;
    }

    if (this.productoEditando.precio < 0) {
      this.mostrarMensajeAlerta('El precio debe ser mayor o igual a 0', 'error');
      return;
    }

    if (this.productoEditando.stock < 0) {
      this.mostrarMensajeAlerta('El stock debe ser mayor o igual a 0', 'error');
      return;
    }

    const productoActualizar = {
      codigo: this.productoEditando.codigo,
      nombre: this.productoEditando.nombre,
      categoria: this.productoEditando.categoria,
      precio: Number(this.productoEditando.precio),
      stock: Number(this.productoEditando.stock),
      estadoStock: this.productoEditando.estadoStock,
      fila: Number(this.productoEditando.fila),
      posicion: Number(this.productoEditando.posicion),
      relay: Number(this.productoEditando.relay),
      habilitado: this.productoEditando.estadoStock !== 'AGOTADO',
      stockMinimo: 5
    };

    console.log('Actualizando producto vending:', productoActualizar);

    // Verificar si hay imagen nueva o modificada
    const imagenOriginal = this.productoEditando.imagen;
    const hayImagenNueva = this.imagenPreview && 
                           this.imagenPreview.startsWith('data:image') && 
                           this.imagenPreview !== imagenOriginal;

    this.ApiService.actualizarProductoVending(this.productoEditando.id, productoActualizar).subscribe(
      (response) => {
        console.log('Producto actualizado:', response);
        
        // Si hay nueva imagen, actualizarla
        if (hayImagenNueva) {
          console.log('Actualizando imagen...');
          this.actualizarImagen(this.productoEditando.id);
        } else {
          this.mostrarMensajeAlerta('Producto actualizado exitosamente', 'success');
          this.cerrarModal();
          this.cargarProductosDisponibles();
        }
      },
      (error) => {
        console.error('Error al actualizar producto:', error);
        this.mostrarMensajeAlerta('Error al actualizar el producto', 'error');
      }
    );
  }

  actualizarImagen(idProducto: number): void {
    if (!this.imagenPreview || !this.imagenPreview.startsWith('data:image')) {
      this.mostrarMensajeAlerta('No hay imagen válida para actualizar', 'error');
      return;
    }

    console.log('Enviando imagen a:', `POST /api/productos/vending/${idProducto}/imagen`);

    this.ApiService.actualizarImagenVending(idProducto, this.imagenPreview).subscribe(
      (response) => {
        console.log('Imagen actualizada exitosamente:', response);
        this.mostrarMensajeAlerta('Producto e imagen actualizados exitosamente', 'success');
        this.cerrarModal();
        this.cargarProductosDisponibles();
      },
      (error) => {
        console.error('Error al actualizar imagen:', error);
        this.mostrarMensajeAlerta('Error al actualizar la imagen', 'error');
      }
    );
  }
}
