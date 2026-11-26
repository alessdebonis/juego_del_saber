// Caso de uso: Elegir personaje.
export class ElegirPersonajeControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(personaje) {
    this.ctx.jugador.elegirPersonaje(personaje);
    this.ctx.vista.actualizarAvatar(personaje);
    return personaje;
  }
}
