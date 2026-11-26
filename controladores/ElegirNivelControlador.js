import { Nivel } from "../modelo/index.js";
import { DIALOGOS } from "../datos/contenido.js";
import { estadoDimension } from "./progresoDimension.js";

// Caso de uso: Elegir nivel.
// Cada partida crea un Nivel nuevo con sus propios retos (composición): los retos se generan
// mientras se juega, así nunca son los mismos. El nivel de la dimensión guarda el banco de retos del admin.
const DIFICULTAD_INICIAL = { 1: 1, 2: 3, 3: 4, 4: 3 };

export class ElegirNivelControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(nivelBase) {
    if (!nivelBase) return false;
    const { jugador, c, vista } = this.ctx;
    const esJefe = nivelBase.dificultad === "jefe";
    if (esJefe && !jugador.opciones.modoDemo && !estadoDimension(jugador, jugador.dimensionActual).jefeDespierto) {
      vista.decir(DIALOGOS.jefeBloqueado);
      vista.sonido("error");
      return false;
    }
    const partida = new Nivel(nivelBase.numero, nivelBase.dificultad, [], nivelBase.invento);
    jugador.elegirNivel(partida);
    // La dificultad adaptativa (1 a 5) vive en Progreso.nivelActual.
    jugador.progreso.nivelActual = DIFICULTAD_INICIAL[nivelBase.numero] ?? Math.min(5, nivelBase.numero);
    if (esJefe) vista.decir(DIALOGOS.jefeAparece);
    c.jugarNivel.ejecutar(nivelBase.retos);
    return true;
  }
}
