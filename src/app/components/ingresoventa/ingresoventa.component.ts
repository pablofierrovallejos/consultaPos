import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ApiService } from '../../service/api.service';
import { Venta, DetalleVenta, Producto } from '../../models/venta.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ingresoventa',
  templateUrl: './ingresoventa.component.html',
  styleUrls: ['./ingresoventa.component.css']
})
export class IngresoventaComponent implements OnInit {

  ventaForm!: FormGroup;
  productos: Producto[] = [];
  mostrarMensaje: boolean = false;
  mensajeTexto: string = '';
  mensajeTipo: 'success' | 'error' = 'success';
  guardando: boolean = false;

  tiposPago = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TARJETA', label: 'Tarjeta' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' }
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    // this.cargarProductos(); // Comentado: no es necesario cargar productos
    this.agregarDetalle(); // Agregar primera línea de detalle
  }

  inicializarFormulario(): void {
    const hoy = new Date().toISOString().split('T')[0];

    this.ventaForm = this.fb.group({
      // Datos del encabezado
      fechaventa: [hoy, Validators.required],
      nroboleta: [''], // Sin validación requerida
      tipopago: ['EFECTIVO', Validators.required],

      // Datos opcionales de Transbank
      comisiontbk: [0],
      comunicacionpos: [''],
      estadotransbank: [''],
      trazastattransbk: [''],
      longmsgtransbank: [''],

      // Array de detalles
      detalles: this.fb.array([])
    });

    // Suscribirse a cambios en los detalles para recalcular totales
    this.ventaForm.get('detalles')?.valueChanges.subscribe(() => {
      this.calcularTotales();
    });
  }

  cargarProductos(): void {
    this.api.getProductos().subscribe(
      (data: Producto[]) => {
        this.productos = data;
      },
      error => {
        console.error('Error al cargar productos:', error);
        this.mostrarMensajeAlerta('Error al cargar productos', 'error');
      }
    );
  }

  get detalles(): FormArray {
    return this.ventaForm.get('detalles') as FormArray;
  }

  crearDetalle(): FormGroup {
    return this.fb.group({
      idproducto: ['', Validators.required],
      nombreproducto: [''], // Sin validación requerida
      cantidad: [1, [Validators.required, Validators.min(1)]],
      preciounitario: [0, [Validators.required, Validators.min(0)]],
      preciosubtotal: [0]
    });
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalle());
  }

  eliminarDetalle(index: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(index);
      this.calcularTotales();
    }
  }

  onProductoChange(index: number): void {
    // Comentado: Ya no se usa autocompletado desde catálogo de productos
    // const detalle = this.detalles.at(index);
    // const idproducto = detalle.get('idproducto')?.value;
    //
    // // Intentar buscar el producto en el catálogo (opcional)
    // const producto = this.productos.find(p => p.idproducto == idproducto);
    //
    // if (producto) {
    //   // Si encuentra el producto, autocompletar datos
    //   detalle.patchValue({
    //     nombreproducto: producto.nombreproducto,
    //     preciounitario: producto.preciounit
    //   });
    //   this.calcularSubtotalDetalle(index);
    // }
    // Si no encuentra el producto, permitir entrada manual sin error
  }

  onCantidadChange(index: number): void {
    this.calcularSubtotalDetalle(index);
  }

  calcularSubtotalDetalle(index: number): void {
    const detalle = this.detalles.at(index);
    const cantidad = detalle.get('cantidad')?.value || 0;
    const preciounitario = detalle.get('preciounitario')?.value || 0;
    const subtotal = cantidad * preciounitario;

    detalle.patchValue({
      preciosubtotal: subtotal
    }, { emitEvent: false });

    this.calcularTotales();
  }

  calcularTotales(): void {
    let totalArticulos = 0;
    let subtotalVenta = 0;

    this.detalles.controls.forEach(detalle => {
      const cantidad = detalle.get('cantidad')?.value || 0;
      const subtotal = detalle.get('preciosubtotal')?.value || 0;

      totalArticulos += Number(cantidad);
      subtotalVenta += Number(subtotal);
    });

    const iva = subtotalVenta * 0.19; // 19% de IVA
    const totalImporte = subtotalVenta + iva;

    // Actualizar valores calculados (sin validaciones para estos campos)
    this.ventaForm.patchValue({
      totalarticulos: totalArticulos,
      subtotalventa: subtotalVenta.toFixed(2),
      iva: iva.toFixed(2),
      totalimporte: totalImporte.toFixed(2)
    }, { emitEvent: false });
  }

  getTotalArticulos(): number {
    return this.detalles.controls.reduce((total, detalle) => {
      return total + (Number(detalle.get('cantidad')?.value) || 0);
    }, 0);
  }

  getSubtotalVenta(): number {
    return this.detalles.controls.reduce((total, detalle) => {
      return total + (Number(detalle.get('preciosubtotal')?.value) || 0);
    }, 0);
  }

  getIVA(): number {
    return this.getSubtotalVenta() * 0.19;
  }

  getTotalImporte(): number {
    return this.getSubtotalVenta() + this.getIVA();
  }

  async guardarVenta(): Promise<void> {
    if (this.ventaForm.invalid) {
      this.mostrarMensajeAlerta('Por favor complete todos los campos requeridos', 'error');
      this.marcarCamposComoTocados();
      return;
    }

    if (this.detalles.length === 0) {
      this.mostrarMensajeAlerta('Debe agregar al menos un producto', 'error');
      return;
    }

    this.guardando = true;

    try {
      // Obtener fecha con hora actual como timestamp/ISO
      const fechaInput = this.ventaForm.get('fechaventa')?.value; // YYYY-MM-DD del input
      const now = new Date();

      // Crear objeto Date con la fecha seleccionada y la hora actual
      const [year, month, day] = fechaInput.split('-').map(Number);
      const fechaConHora = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

      // Convertir a timestamp (milisegundos) que Java puede interpretar
      const fechaTimestamp = fechaConHora.getTime();

      // Preparar datos del encabezado
      const venta: Venta = {
        fechaventa: fechaTimestamp, // Enviar como timestamp numérico
        nroboleta: this.ventaForm.get('nroboleta')?.value || '',
        totalarticulos: Math.round(this.getTotalArticulos()), // int
        subtotalventa: Math.round(this.getSubtotalVenta()), // int
        iva: Math.round(this.getIVA()), // int
        totalimporte: Math.round(this.getTotalImporte()), // int
        tipopago: this.ventaForm.get('tipopago')?.value || 'EFECTIVO',
        comisiontbk: Math.round(Number(this.ventaForm.get('comisiontbk')?.value) || 0), // int
        comunicacionpos: 'INGRESO MANUAL', // Identificador de venta manual
        estadotransbank: this.ventaForm.get('estadotransbank')?.value || '',
        trazastattransbk: this.ventaForm.get('trazastattransbk')?.value || '',
        longmsgtransbank: this.ventaForm.get('longmsgtransbank')?.value || ''
      };

      console.log('Enviando venta al backend:', venta);

      // Insertar encabezado de venta
      const ventaResult = await this.api.insertarVenta(venta).toPromise();
      console.log('Respuesta del backend insertarVenta:', ventaResult);
      console.log('Tipo de respuesta:', typeof ventaResult);

      // Intentar obtener el ID de diferentes formas posibles
      let idventa;

      if (typeof ventaResult === 'number' && ventaResult > 0) {
        // Si el backend devuelve directamente un número válido
        idventa = ventaResult;
      } else if (typeof ventaResult === 'object' && ventaResult !== null) {
        // Si el backend devuelve un objeto
        idventa = ventaResult.idventa || ventaResult.id || ventaResult.IdVenta || ventaResult.ID;
      }

      // Si no se obtiene un ID válido del backend, generar uno basado en timestamp
      if (!idventa || idventa === 0) {
        console.warn('⚠️ ADVERTENCIA: El backend retornó ID inválido, generando ID manual');
        // Generar ID en formato YYMMDDHHMMSS
        const now = new Date();
        const yy = now.getFullYear().toString().slice(-2);
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const hh = now.getHours().toString().padStart(2, '0');
        const min = now.getMinutes().toString().padStart(2, '0');
        const ss = now.getSeconds().toString().padStart(2, '0');
        idventa = Number(yy + mm + dd + hh + min + ss);
        console.log('✅ ID generado manualmente:', idventa);
      }

      console.log('ID de venta a usar:', idventa);

      // Insertar detalles
      for (const detalleControl of this.detalles.controls) {
        const detalle: DetalleVenta = {
          idventa: idventa,
          nombreproducto: detalleControl.get('nombreproducto')?.value || '',
          idproducto: Math.round(Number(detalleControl.get('idproducto')?.value)),
          cantidad: Math.round(Number(detalleControl.get('cantidad')?.value)),
          preciosubtotal: Math.round(Number(detalleControl.get('preciosubtotal')?.value))
        };

        console.log('Insertando detalle:', detalle);
        await this.api.insertarDetalleVenta(detalle).toPromise();
      }

      this.mostrarMensajeAlerta('Venta guardada exitosamente', 'success');
      this.limpiarFormulario();

    } catch (error) {
      console.error('Error al guardar venta:', error);
      this.mostrarMensajeAlerta('Error al guardar la venta. Por favor intente nuevamente.', 'error');
    } finally {
      this.guardando = false;
    }
  }

  marcarCamposComoTocados(): void {
    Object.keys(this.ventaForm.controls).forEach(key => {
      this.ventaForm.get(key)?.markAsTouched();
    });

    this.detalles.controls.forEach(detalle => {
      Object.keys(detalle.value).forEach(key => {
        detalle.get(key)?.markAsTouched();
      });
    });
  }

  limpiarFormulario(): void {
    this.ventaForm.reset({
      fechaventa: new Date().toISOString().split('T')[0],
      tipopago: 'EFECTIVO',
      comisiontbk: 0
    });

    // Limpiar array de detalles
    while (this.detalles.length > 0) {
      this.detalles.removeAt(0);
    }

    // Agregar una línea vacía
    this.agregarDetalle();
  }

  mostrarMensajeAlerta(texto: string, tipo: 'success' | 'error'): void {
    this.mensajeTexto = texto;
    this.mensajeTipo = tipo;
    this.mostrarMensaje = true;

    setTimeout(() => {
      this.mostrarMensaje = false;
    }, 5000);
  }

  cerrarMensaje(): void {
    this.mostrarMensaje = false;
  }

  volverHome(): void {
    this.router.navigate(['/']);
  }
}
