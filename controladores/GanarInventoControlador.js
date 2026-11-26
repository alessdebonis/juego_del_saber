import { revisarLogros } from "./reglasLogros.js";

// Caso de uso: Ganar invento «include» de Jugar nivel.
export class GanarInventoControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(nivel) {
    const { jugador, vista } = this.ctx;
    const invento = nivel.invento;
    if (!invento) return null;
    const esNuevo = !jugador.inventos.includes(invento);
    if (esNuevo) jugador.inventos.push(invento);   // agregación: el invento ya existía, el jugador lo colecciona
    const logros = revisarLogros(this.ctx);
    vista.sonido("premio");
    vista.mostrarRecompensa(invento, esNuevo, logros);
    vista.actualizarHUD();
    return invento;
  }
}
