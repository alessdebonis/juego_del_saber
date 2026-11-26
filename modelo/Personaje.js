// Personaje: el avatar que usa el jugador.
export class Personaje {
  constructor(nombre, tipo, accesorios = []) {
    this.nombre = nombre;
    this.tipo = tipo;           // "explorador" | "cientifica" | "robot"
    this.accesorios = [...accesorios];
  }

  // Pone o quita un accesorio (gafas, gorro, mochila).
  personalizar(a) {
    if (this.accesorios.includes(a)) {
      this.accesorios = this.accesorios.filter(x => x !== a);
    } else {
      this.accesorios.push(a);
    }
  }
}
