// Invento: recompensa de un nivel. Su efecto ayuda en los retos siguientes.
// Efectos: "quitar" (quita una opción incorrecta), "leer" (lee el reto en voz alta), "energia" (+20 al portal).
export class Invento {
  constructor(nombre, descripcion, efecto) {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.efecto = efecto;
  }

  usar() {
    return this.efecto;
  }
}
