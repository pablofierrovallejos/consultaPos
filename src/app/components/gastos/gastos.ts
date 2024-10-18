export class Gastos {
    constructor(
          public idcostos: number,
          public fecha: string,
          public item: string,
          public cantidad: number,
          public montototal: number,
          public descripcion: string
      ) { }
  }