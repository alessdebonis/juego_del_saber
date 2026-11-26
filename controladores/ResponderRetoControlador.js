import { DIALOGOS } from "../datos/contenido.js";
import { esDeArmar } from "../datos/generadores.js";
import { revisarLogros } from "./reglasLogros.js";

const alAzar = lista => lista[Math.floor(Math.random() * lista.length)];

// Caso de uso: Responder reto «include» de Jugar nivel. Lo extiende «Pedir pista».
// Aprender del error: al primer error Rick da la pista; al segundo explica la respuesta.
// Racha: los aciertos seguidos multiplican la energía (x2 desde 3 seguidos, x3 desde 6).
export class ResponderRetoControlador {
  static ENERGIA_POR_ACIERTO = 10;
  static ENERGIA_POR_LETRA = 4;

  constructor(ctx) {
    this.ctx = ctx;
    this.fallos = 0;
    this.racha = 0;
    this.mejorRacha = 0;
  }

  nuevoReto() { this.fallos = 0; }

  multiplicador() { return this.racha >= 6 ? 3 : this.racha >= 3 ? 2 : 1; }

  ejecutar(letra) {
    const { jugador, vista } = this.ctx;
    const nivel = jugador.nivelActual;
    const reto = nivel.retoActual();
    const correcta = reto.verificarRespuesta(letra);
    const deArmar = esDeArmar(reto);
    vista.marcarRespuesta(letra, correcta, reto);

    if (correcta) {
      this.racha += 1;
      this.mejorRacha = Math.max(this.mejorRacha, this.racha);
      const base = deArmar ? ResponderRetoControlador.ENERGIA_POR_LETRA : ResponderRetoControlador.ENERGIA_POR_ACIERTO;
      jugador.portal.recargar(base * this.multiplicador());
      nivel.aciertos += 1;
      nivel.indiceReto += 1;
      if (!deArmar || nivel.retoActual()?.pregunta.split(":")[0] !== reto.pregunta.split(":")[0]) {
        jugador.progreso.retosCompletados += 1;
      }
      vista.sonido("acierto", this.racha);
      vista.reaccion("bien", this.racha);
      if (!deArmar || this.fallos === 0) vista.decir(deArmar ? `¡${letra}! Sigue así.` : alAzar(DIALOGOS.correcto));
      vista.actualizarRacha(this.racha, this.multiplicador());
      for (const logro of revisarLogros(this.ctx)) vista.anunciarLogro(logro);
      vista.actualizarHUD();
      return "bien";
    }

    this.fallos += 1;
    this.racha = 0;
    vista.actualizarRacha(0, 1);
    vista.sonido("error");
    vista.reaccion("mal");

    if (this.fallos === 1) {
      const enJefe = nivel.dificultad === "jefe";
      vista.decir(enJefe ? `${DIALOGOS.jefeRie} Pista: ${reto.darPista()}` : `${alAzar(DIALOGOS.incorrecto)} Pista: ${reto.darPista()}`);
      return "mal";
    }

    // Segundo error: Rick explica, muestra la respuesta y el reto vuelve después para repasar.
    nivel.indiceReto += 1;
    const respuesta = deArmar ? reto.respuestaCorrecta : reto.opciones["ABC".indexOf(reto.respuestaCorrecta)];
    // Si el reto salió del material del profe, Rick explica con esa frase y no con palabras suyas.
    const porque = reto.fuente ? `Según tu material: «${reto.fuente}»` : reto.darPista();
    vista.mostrarExplicacion(reto, `La respuesta es «${respuesta}». ${porque}`);
    vista.decir(deArmar ? `Era la «${respuesta}». ¡Sigamos!` : `Te explico: la respuesta es «${respuesta}». Lo repasamos más tarde.`);
    vista.actualizarHUD();
    return "explicado";
  }
}
