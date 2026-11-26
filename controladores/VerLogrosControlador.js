import { estadoDimension } from "./progresoDimension.js";

// Caso de uso: Ver logros. Incluye el mapa del multiverso (el progreso por dimensión).
export class VerLogrosControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar() {
    const { jugador, vista, c } = this.ctx;
    vista.mostrarLogros(jugador.progreso.logros, jugador.inventos, c.completarMisionDiaria.asegurarMisionDeHoy(), jugador.progreso);
  }

  estadoDimensiones() {
    const { jugador, dimensiones } = this.ctx;
    return jugador ? dimensiones.map(d => estadoDimension(jugador, d)) : [];
  }

  mapa() {
    this.ctx.vista.mostrarMapa(this.estadoDimensiones(), this.ctx.jugador.inventos);
  }
}
