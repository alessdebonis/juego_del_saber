// Caso de uso: Guardar progreso «include» de Jugar nivel.
// «include» Enviar reporte de progreso: cada vez que se guarda, el tutor recibe el reporte actualizado.
export class GuardarProgresoControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar() {
    const { jugador, c } = this.ctx;
    if (!jugador) return;
    jugador.progreso.guardar();
    c.enviarReporteProgreso.ejecutar();   // include
  }
}
