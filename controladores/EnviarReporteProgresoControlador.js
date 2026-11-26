// Caso de uso: Enviar reporte de progreso «include» de Guardar progreso.
// El Tutor (padre o docente) es el actor secundario que lo recibe.
export class EnviarReporteProgresoControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar() {
    const { jugador, tutor, almacen } = this.ctx;
    const reporte = tutor.recibirReporte(jugador.progreso);
    almacen.guardarTutor(tutor);
    return `Reporte de ${jugador.nombre}\n${reporte}`;
  }
}
