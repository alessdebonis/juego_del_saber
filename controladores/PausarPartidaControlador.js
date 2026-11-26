// Caso de uso: Pausar partida.
export class PausarPartidaControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar() {
    const pausado = this.ctx.jugador.pausarPartida();
    this.ctx.vista.mostrarPausa(pausado);
    return pausado;
  }
}
