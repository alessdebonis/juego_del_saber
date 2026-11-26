// Caso de uso: Personalizar personaje «extend» Elegir personaje (opcional).
export class PersonalizarPersonajeControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(personaje, accesorio) {
    personaje.personalizar(accesorio);
    this.ctx.vista.actualizarAvatar(personaje);
    return personaje.accesorios;
  }
}
