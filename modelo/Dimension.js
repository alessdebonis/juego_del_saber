// Dimension: compuesta por Niveles (composición).
import { Nivel } from "./Nivel.js";

export class Dimension {
  constructor(nombre, materia, desbloqueada = true, niveles = []) {
    this.nombre = nombre;
    this.materia = materia;   // "lectura" | "matematicas" | "escritura"
    this.desbloqueada = desbloqueada;
    this.niveles = niveles.map(n => new Nivel(n.numero, n.dificultad, n.retos, n.invento));
  }

  desbloquear() {
    this.desbloqueada = true;
  }
}
