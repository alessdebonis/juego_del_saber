// Caso de uso: Cerrar sesión.
export class CerrarSesionControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar() {
    const { jugador, vista, c } = this.ctx;
    if (!jugador) return;
    c.guardarProgreso.ejecutar();
    jugador.cerrarSesion();
    jugador.pausado = false;
    this.ctx.jugador = null;
    vista.irAlInicio();
  }
}
