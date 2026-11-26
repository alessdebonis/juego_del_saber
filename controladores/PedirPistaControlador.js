import { DIALOGOS } from "../datos/contenido.js";

// Caso de uso: Pedir pista «extend» Responder reto.
export class PedirPistaControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar() {
    const reto = this.ctx.jugador.nivelActual?.retoActual();
    if (!reto) return null;
    const pista = reto.darPista();
    this.ctx.vista.decir(DIALOGOS.pista(pista));
    return pista;
  }
}
