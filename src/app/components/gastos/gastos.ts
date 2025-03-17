export class Gastos {
    constructor(
          public fecha: Date,
          public item: string,
          public cantidad: number,
          public montototal: number,
          public descripcion: string
      ) { }
  }