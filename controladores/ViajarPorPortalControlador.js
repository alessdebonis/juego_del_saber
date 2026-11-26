import { revisarLogros } from "./reglasLogros.js";

// Caso de uso: Viajar por portal. Lo extiende «Desbloquear dimensión».
export class ViajarPorPortalControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(dimension) {
    const { jugador, vista, c } = this.ctx;
    if (!jugador.portal.abrir(dimension)) {
      // Extensión: solo ocurre si la dimensión está bloqueada.
      const abierta = c.desbloquearDimension.ejecutar(dimension);
      if (!abierta) return false;
    }
    jugador.viajarPorPortal(dimension);
    vista.sonido("portal");
    vista.irADimension(dimension);
    for (const logro of revisarLogros(this.ctx)) vista.anunciarLogro(logro);
    c.explorarDimension.ejecutar();
    c.guardarProgreso.ejecutar();
    return true;
  }

  volverAlGaraje() {
    const { jugador, vista, c } = this.ctx;
    if (jugador.nivelActual) c.jugarNivel.salir();
    jugador.dimensionActual = null;
    jugador.nivelActual = null;
    jugador.explorando = false;
    vista.sonido("portal");
    vista.irAlGaraje();
  }
}
