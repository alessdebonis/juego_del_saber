// MisionDiaria: un objetivo corto para cada día.
export class MisionDiaria {
  constructor(descripcion, fecha = new Date(), completada = false) {
    this.descripcion = descripcion;
    this.fecha = new Date(fecha);
    this.completada = completada;
  }

  completar() {
    this.completada = true;
  }
}
