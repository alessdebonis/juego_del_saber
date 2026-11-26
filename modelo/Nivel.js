// Nivel: compuesto por Retos (composición) y otorga un Invento (asociación).
import { Reto } from "./Reto.js";

export class Nivel {
  constructor(numero, dificultad, retos = [], invento = null) {
    this.numero = numero;
    this.dificultad = dificultad;   // "fácil" | "medio" | "difícil"
    // Composición: el nivel crea sus propios retos; si se borra el nivel, se borran sus retos.
    this.retos = retos.map(r => new Reto(r.pregunta, r.opciones, r.respuestaCorrecta, r.pista, r.fuente));
    this.invento = invento;          // Nivel "1" -- "1" Invento : otorga
    this.indiceReto = 0;
    this.aciertos = 0;
  }

  iniciar() {
    this.indiceReto = 0;
    this.aciertos = 0;
  }

  retoActual() {
    return this.retos[this.indiceReto] ?? null;
  }

  // Devuelve true cuando ya no quedan retos.
  finalizar() {
    return this.indiceReto >= this.retos.length;
  }
}
