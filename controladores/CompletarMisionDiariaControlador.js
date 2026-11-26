import { MisionDiaria } from "../modelo/index.js";

const hoy = () => new Date().toDateString();

// Caso de uso: Completar misión diaria. La misión de cada día es terminar un nivel.
export class CompletarMisionDiariaControlador {
  constructor(ctx) { this.ctx = ctx; }

  asegurarMisionDeHoy() {
    const { progreso } = this.ctx.jugador;
    const ultima = progreso.misiones.at(-1);
    if (!ultima || ultima.fecha.toDateString() !== hoy()) {
      progreso.misiones.push(new MisionDiaria("Termina un nivel en cualquier dimensión"));
    }
    return progreso.misiones.at(-1);
  }

  ejecutar() {
    const mision = this.asegurarMisionDeHoy();
    if (mision.completada) return false;
    mision.completar();
    this.ctx.vista.anunciar("Misión diaria completada", mision.descripcion);
    return true;
  }
}
