// Tutor: padre o docente (actor secundario). No juega: solo recibe el reporte de progreso.
export class Tutor {
  constructor(nombre = "", correo = "", parentesco = "") {
    this.nombre = nombre;
    this.correo = correo;
    this.parentesco = parentesco;   // "padre", "madre", "docente"...
    this.jugadores = [];             // Tutor "1..*" -- "1..*" Jugador : supervisa
    this.ultimoReporte = "";
  }

  recibirReporte(p) {
    this.ultimoReporte = p.generarReporte();
    return this.ultimoReporte;
  }
}
