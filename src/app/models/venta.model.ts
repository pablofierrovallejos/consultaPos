// Modelo para el encabezado de la venta
export interface Venta {
  idventa?: number;
  fechaventa: string | number; // Puede ser string ISO o timestamp numérico
  secuencia?: number;
  nroboleta?: string;
  totalarticulos: number;
  subtotalventa: number;
  iva: number;
  totalimporte: number;
  tipopago: string;
  comisiontbk?: number;
  comunicacionpos?: string;
  estadotransbank?: string;
  trazastattransbk?: string;
  longmsgtransbank?: string;
}

// Modelo para el detalle de la venta
export interface DetalleVenta {
  idventa?: number;
  nombreproducto: string;
  idproducto: number;
  cantidad: number;
  preciosubtotal: number;
}

// Modelo para el producto seleccionable
export interface Producto {
  idproducto: number;
  nombreproducto: string;
  preciounit: number;
  stock?: number;
}
