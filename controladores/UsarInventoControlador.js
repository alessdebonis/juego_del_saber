import { esDeArmar } from "../datos/generadores.js";
import { EFECTOS_MUNDO } from "../datos/contenido.js";

// Caso de uso: Usar invento «extend» Jugar nivel.
// Cada invento se puede usar una vez por reto.
export class UsarInventoControlador {
  constructor(ctx) {
    this.ctx = ctx;
    this.usadosEnEsteReto = new Set();
  }

  reiniciar() { this.usadosEnEsteReto.clear(); }

  // Inventos legendarios: cambian el mundo y se encienden o apagan en cualquier momento.
  alternarEfecto(invento) {
    const efecto = this.ctx.jugador.usarInvento(invento);
    if (!EFECTOS_MUNDO.includes(efecto)) return null;
    const activo = this.ctx.vista.alternarEfecto(efecto);
    this.ctx.vista.decir(`${invento.nombre}: ${activo ? "¡activado!" : "apagado."}`);
    this.ctx.vista.sonido("invento");
    return activo;
  }

  ejecutar(invento) {
    const { jugador, vista } = this.ctx;
    if (EFECTOS_MUNDO.includes(invento.efecto)) return this.alternarEfecto(invento);
    const reto = jugador.nivelActual?.retoActual();
    if (!reto || this.usadosEnEsteReto.has(invento)) return null;
    const efecto = jugador.usarInvento(invento);
    if (!efecto) return null;
    this.usadosEnEsteReto.add(invento);

    if (efecto === "quitar") {
      if (invento.nombre === "Rayo encogedor") vista.encoger();
      if (esDeArmar(reto)) {
        // Quita una letra que sobra: no está en lo que falta de la palabra.
        const nivel = jugador.nivelActual;
        const grupo = nivel.retos.slice(nivel.indiceReto).filter(r => r.opciones.join() === reto.opciones.join());
        const faltan = grupo.map(r => r.respuestaCorrecta);
        const sobrante = vista.letrasEnMundo().find(l => {
          const i = faltan.indexOf(l);
          if (i === -1) return true;
          faltan.splice(i, 1);
          return false;
        });
        if (sobrante) vista.ocultarOpcion(sobrante);
        vista.decir(`${invento.nombre}: ¡una letra que sobra menos!`);
      } else {
        const letras = ["A", "B", "C"].slice(0, reto.opciones.length);
        const incorrectas = letras.filter(l => l !== reto.respuestaCorrecta && !vista.opcionOculta(l));
        if (incorrectas.length) vista.ocultarOpcion(incorrectas[0]);
        vista.decir(`${invento.nombre}: ¡una opción menos!`);
      }
    }
    if (efecto === "leer") {
      vista.hablar(`${reto.pregunta}. Opciones: ${reto.opciones.join(", ")}`, true);
      vista.decir(`${invento.nombre}: te leo el reto.`);
    }
    if (efecto === "energia") {
      jugador.portal.recargar(20);
      vista.actualizarHUD();
      vista.decir(`${invento.nombre}: +20 de energía para el portal.`);
    }
    vista.sonido("invento");
    return efecto;
  }
}
