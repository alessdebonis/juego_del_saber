import { Reto } from "../modelo/index.js";
import { DIALOGOS } from "../datos/contenido.js";
import { generarRetos, esDeArmar } from "../datos/generadores.js";
import { revisarLogros } from "./reglasLogros.js";

const LETRAS = ["A", "B", "C"];
const copiar = r => new Reto(r.pregunta, r.opciones, r.respuestaCorrecta, r.pista, r.fuente);

// Copia con las opciones en otro orden. En los mundos del profe las preguntas se repiten,
// así el niño tiene que leer otra vez y no se aprende "era la B".
function copiarMezclado(r) {
  const correcta = r.opciones[LETRAS.indexOf(r.respuestaCorrecta)];
  const opciones = [...r.opciones];
  for (let i = opciones.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opciones[i], opciones[j]] = [opciones[j], opciones[i]]; }
  return new Reto(r.pregunta, opciones, LETRAS[opciones.indexOf(correcta)], r.pista, r.fuente);
}

// Caso de uso: Jugar nivel.
// «include» Responder reto, Ganar invento y Guardar progreso (siempre pasan).
// «extend» Usar invento (opcional).
// Aquí vive el aprendizaje: retos nuevos, dificultad que se adapta y repaso de lo que se falló.
// En un mundo creado desde el material del profe (materia "material") solo salen las preguntas
// que el profe aprobó: ni generadores ni IA en vivo, para que nada inventado llegue al niño.
export class JugarNivelControlador {
  static RETOS_POR_NIVEL = 5;

  constructor(ctx) {
    this.ctx = ctx;
    this.sesion = null;
    this.repasosResueltos = 0;
  }

  #esJefe() { return this.ctx.jugador.nivelActual?.dificultad === "jefe"; }
  #soloMaterial() { return this.#materia() === "material"; }
  #meta() {
    const base = this.#esJefe() ? 6 : JugarNivelControlador.RETOS_POR_NIVEL;
    // Si el profe aprobó pocas preguntas para este nivel, la meta son esas preguntas.
    return this.#soloMaterial() && this.sesion ? Math.min(base, this.sesion.bancoCompleto.length) : base;
  }

  async ejecutar(bancoAdmin = []) {
    const { jugador, vista } = this.ctx;
    const material = this.#soloMaterial();
    // En un mundo del profe, el guardián pregunta de todo lo de los niveles 1, 2 y 3.
    const banco = material && this.#esJefe()
      ? jugador.dimensionActual.niveles.filter(n => n.dificultad !== "jefe").flatMap(n => n.retos)
      : bancoAdmin;
    if (material && !banco.length) {
      this.salir();
      vista.decir("Este cristal todavía no tiene preguntas. Pídele a tu profe que las agregue.");
      return;
    }
    // Rick le pide retos nuevos a la IA y espera unos segundos a que lleguen; si tarda, empieza con retos locales.
    const ia = this.ctx.ia;
    if (!material && ia?.disponible()) {
      ia.precargar(this.#materia(), jugador.progreso.nivelActual, jugador.edad);
      vista.cargandoRetos(true);
      this.esperando = true;
      await ia.esperar(this.#materia(), jugador.progreso.nivelActual, 5000);
      this.esperando = false;
      vista.cargandoRetos(false);
      if (!jugador.nivelActual) return;   // salió mientras esperaba
    }
    this.sesion = {
      resueltos: 0,
      restantesGrupo: 0,
      grupoConError: false,
      esRepaso: false,
      repaso: [],
      banco: banco.map(material ? copiarMezclado : copiar),
      bancoCompleto: banco,
      bienSeguidos: 0,
      malSeguidos: 0,
    };
    if (this.#esJefe()) vista.mostrarJefe(this.#meta());
    this.#agregarSiguiente();
    jugador.jugarNivel();   // Nivel.iniciar() y primer reto
    this.#mostrar();
  }

  #materia() { return this.ctx.jugador.dimensionActual?.materia ?? "lectura"; }

  // Decide qué reto viene: un repaso de algo que falló, uno del banco del profe o uno generado.
  #agregarSiguiente() {
    const s = this.sesion;
    const nivel = this.ctx.jugador.nivelActual;
    const terminoNuevos = s.resueltos >= this.#meta();
    let grupo;
    s.esRepaso = false;
    if (s.repaso.length && (terminoNuevos || Math.random() < 0.4)) {
      grupo = [s.repaso.shift()];
      s.esRepaso = true;
    } else if (this.#soloMaterial()) {
      // Mundo del profe: solo preguntas aprobadas. Si ya salieron todas, vuelven en otro orden.
      if (!s.banco.length) s.banco = s.bancoCompleto.map(copiarMezclado);
      grupo = [s.banco.splice(Math.floor(Math.random() * s.banco.length), 1)[0]];
    } else if (s.banco.length && Math.random() < (this.ctx.ia?.disponible() ? 0.1 : 0.25)) {
      grupo = [s.banco.splice(Math.floor(Math.random() * s.banco.length), 1)[0]];
    } else {
      // Primero un reto inventado por la IA; si todavía no hay, uno de los generadores locales.
      const dif = this.ctx.jugador.progreso.nivelActual;
      grupo = this.ctx.ia?.tomar(this.#materia(), dif) ?? generarRetos(this.#materia(), dif);
      this.ctx.ia?.precargar(this.#materia(), dif, this.ctx.jugador.edad);
    }
    nivel.retos.push(...grupo);
    s.restantesGrupo = grupo.length;
    s.grupoConError = false;
  }

  #mostrar() {
    const { jugador, vista, c } = this.ctx;
    this.esperando = false;
    if (!jugador.nivelActual) return;
    c.usarInvento.reiniciar();
    c.responderReto.nuevoReto();
    const reto = jugador.nivelActual.retoActual();
    if (!this.#soloMaterial()) this.ctx.ia?.recordarVisto(reto);
    vista.mostrarReto(reto, jugador.nivelActual, {
      ia: this.ctx.ia?.esDeIA(reto) ?? false,
      materia: this.#materia(),
      dificultad: jugador.progreso.nivelActual,
      esRepaso: this.sesion.esRepaso,
      avance: this.sesion.resueltos,
      total: this.#meta(),
      jefe: this.#esJefe(),
    });
  }

  // El jugador escoge una opción (o atrapa una letra).
  responder(letra) {
    const { jugador, vista, c } = this.ctx;
    const nivel = jugador.nivelActual;
    if (!nivel || jugador.pausado || !this.sesion || this.esperando) return;
    const reto = nivel.retoActual();
    if (!reto) return;
    const resultado = c.responderReto.ejecutar(letra);   // include: "bien" | "mal" | "explicado"
    if (resultado === "mal") return;
    this.esperando = true;   // mientras pasa al siguiente reto, no se aceptan más respuestas
    if (resultado === "explicado") {
      this.sesion.grupoConError = true;
      if (this.#soloMaterial()) {
        this.sesion.repaso.push(copiarMezclado(reto));   // vuelve más tarde, con las opciones en otro orden
      } else {
        this.ctx.ia?.recordarFallo(reto);   // la IA prepara un reto parecido para practicar
        if (!esDeArmar(reto)) this.sesion.repaso.push(copiar(reto));  // vuelve más tarde para repasar
      }
    }
    if (resultado === "bien" && this.sesion.esRepaso) {
      this.repasosResueltos += 1;
      for (const logro of revisarLogros(this.ctx)) vista.anunciarLogro(logro);
    }
    // include Guardar progreso después de cada reto: si se cierra la página a mitad
    // del nivel, la energía, los retos y los logros ganados no se pierden.
    c.guardarProgreso.ejecutar();

    this.sesion.restantesGrupo -= 1;
    const espera = resultado === "explicado" ? 3200 : esDeArmar(reto) && this.sesion.restantesGrupo > 0 ? 350 : 1000;
    if (this.sesion.restantesGrupo > 0) {
      setTimeout(() => this.#mostrar(), espera);
      return;
    }

    // Terminó el grupo (un reto o una palabra completa).
    if (!this.sesion.esRepaso) this.sesion.resueltos += 1;
    if (this.#esJefe()) {
      // Contra el guardián, cada grupo resuelto le quita una vida.
      this.ctx.vista.golpearJefe(this.#meta() - this.sesion.resueltos, this.#meta(), !this.sesion.grupoConError);
      if (!this.sesion.grupoConError) this.ctx.vista.decir(DIALOGOS.jefeGolpe[this.sesion.resueltos % DIALOGOS.jefeGolpe.length]);
    }
    this.#adaptarDificultad();
    if (this.sesion.resueltos >= this.#meta() && this.sesion.repaso.length === 0) {
      setTimeout(() => this.terminarNivel(nivel), espera);
      return;
    }
    this.#agregarSiguiente();
    setTimeout(() => this.#mostrar(), espera);
  }

  // Dificultad que se adapta: 2 grupos bien seguidos sube, 2 con error baja (entre 1 y 5).
  #adaptarDificultad() {
    if (this.#soloMaterial()) return;   // en los mundos del profe la dificultad la pone el cristal (1, 2 o 3)
    const s = this.sesion;
    const p = this.ctx.jugador.progreso;
    if (s.grupoConError) { s.malSeguidos += 1; s.bienSeguidos = 0; }
    else { s.bienSeguidos += 1; s.malSeguidos = 0; }
    if (s.bienSeguidos >= 2 && p.nivelActual < 5) {
      p.nivelActual += 1;
      s.bienSeguidos = 0;
      this.ctx.vista.anunciar("¡Más difícil!", `Rick sube el reto a nivel ${p.nivelActual} de 5.`);
    }
    const piso = this.#esJefe() ? 2 : 1;
    if (s.malSeguidos >= 2 && p.nivelActual > piso) {
      p.nivelActual -= 1;
      s.malSeguidos = 0;
      this.ctx.vista.anunciar("Vamos con calma", `Rick baja el reto a nivel ${p.nivelActual} de 5.`);
    }
  }

  terminarNivel(nivel) {
    const { jugador, vista, c } = this.ctx;
    const eraJefe = nivel.dificultad === "jefe";
    if (eraJefe) vista.derrotarJefe();
    const invento = c.ganarInvento.ejecutar(nivel);   // include
    c.completarMisionDiaria.ejecutar();
    c.guardarProgreso.ejecutar();                     // include
    jugador.nivelActual = null;
    this.sesion = null;
    this.esperando = false;
    vista.reaccion("fiesta");
    vista.decir(eraJefe ? DIALOGOS.jefeVencido(invento?.nombre ?? "") : DIALOGOS.nivelCompleto(invento ? invento.nombre : "ninguno"));
    vista.refrescarDimension();
  }

  salir() {
    this.ctx.c.guardarProgreso.ejecutar();   // lo ganado en el nivel queda guardado aunque no se termine
    this.esperando = false;
    this.ctx.vista.ocultarJefe();
    this.ctx.jugador.nivelActual = null;
    this.sesion = null;
    this.ctx.vista.cerrarReto();
  }
}
