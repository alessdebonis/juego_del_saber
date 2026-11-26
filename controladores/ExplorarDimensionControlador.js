import { DIALOGOS, reglasDimension } from "../datos/contenido.js";

// Caso de uso: Explorar dimensión. Lo extiende «Interactuar con objeto».
// Al entrar se muestran las reglas de la dimensión (como en el Motor del Multiverso).
export class ExplorarDimensionControlador {
  constructor(ctx) { this.ctx = ctx; this.vistas = new Set(); }

  ejecutar() {
    const { jugador, vista } = this.ctx;
    jugador.explorarDimension();
    const d = jugador.dimensionActual;
    vista.decir(DIALOGOS.dimension(d.nombre));
    // Solo la primera vez que entra en esta partida; después, con el botón REGLAS.
    if (!this.vistas.has(d.nombre)) {
      this.vistas.add(d.nombre);
      vista.mostrarReglas(d.nombre, reglasDimension(d));
    }
  }

  verReglas() {
    const { jugador, vista } = this.ctx;
    const d = jugador?.dimensionActual;
    if (!d) return vista.decir("Aquí en el garaje solo hay una regla: camina hasta un portal. Las reglas de cada dimensión las ves al entrar.");
    vista.mostrarReglas(d.nombre, reglasDimension(d));
  }
}
