// Progreso: pertenece al jugador (composición). Agrega Logros y MisionesDiarias (agregación).
export class Progreso {
  constructor(nivelActual = 1, retosCompletados = 0, ultimaFecha = null) {
    this.nivelActual = nivelActual;
    this.retosCompletados = retosCompletados;
    this.ultimaFecha = ultimaFecha ? new Date(ultimaFecha) : null;
    this.logros = [];
    this.misiones = [];
    this.alGuardar = null;  // la capa de persistencia conecta aquí cómo se guarda
  }

  guardar() {
    this.ultimaFecha = new Date();
    if (this.alGuardar) this.alGuardar(this);
  }

  generarReporte() {
    const fecha = this.ultimaFecha ? this.ultimaFecha.toLocaleDateString("es-CO") : "sin fecha";
    const logros = this.logros.filter(l => l.fecha).map(l => `• ${l.nombre}`).join("\n") || "• Todavía ninguno";
    const mision = this.misiones.at(-1);
    return [
      `Retos completados: ${this.retosCompletados}`,
      `Nivel de dificultad alcanzado: ${this.nivelActual} de 5`,
      `Última vez que jugó: ${fecha}`,
      `Misión de hoy: ${mision ? `${mision.descripcion} (${mision.completada ? "completada" : "pendiente"})` : "sin misión"}`,
      `Logros:`,
      logros,
    ].join("\n");
  }
}
