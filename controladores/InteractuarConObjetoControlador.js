import { CHARCO_COSTO, DIALOGOS } from "../datos/contenido.js";

// Caso de uso: Interactuar con objeto «extend» Explorar dimensión.
// En cada dimensión hay cristales numerados: tocarlos lleva a ese nivel.
// También hay charcos de fluido de portal (zona prohibida): pisarlos cuesta energía.
export class InteractuarConObjetoControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(numeroNivel) {
    const { jugador, c } = this.ctx;
    if (jugador.pausado || jugador.nivelActual) return null;
    const nivel = jugador.interactuarConObjeto(numeroNivel);
    if (nivel) c.elegirNivel.ejecutar(nivel);
    return nivel;
  }

  pisarCharco() {
    const { jugador, vista, c } = this.ctx;
    if (jugador.pausado || jugador.nivelActual) return;
    const portal = jugador.portal;
    portal.energia = Math.max(0, portal.energia - CHARCO_COSTO);
    vista.sonido("error");
    vista.actualizarHUD();
    vista.decir(DIALOGOS.charco(CHARCO_COSTO, portal.energia));
    c.guardarProgreso.ejecutar();
  }
}
