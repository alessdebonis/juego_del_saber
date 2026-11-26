// Logro: medalla que el jugador gana.
export class Logro {
  constructor(nombre, descripcion, fecha = null) {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.fecha = fecha;
  }

  otorgar() {
    if (!this.fecha) this.fecha = new Date();
  }
}
