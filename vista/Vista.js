// Vista (la V de MVC): pantallas, botones y el mundo 3D.
// Solo muestra cosas y le pasa al controlador lo que hace el niño. No decide nada del juego.
import { Mundo3D } from "./Mundo3D.js";
import { ACCESORIOS } from "../datos/contenido.js";
import { esDeArmar } from "../datos/generadores.js";

const $ = sel => document.querySelector(sel);
const LETRAS = ["A", "B", "C"];
// Textos que pueden venir de la IA o de un archivo importado: se escapan antes de ponerlos en el HTML.
const escapar = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Crea un elemento con sus propiedades y sus hijos (texto o elementos), sin usar innerHTML.
function el(etiqueta, props = {}, ...hijos) {
  const e = Object.assign(document.createElement(etiqueta), props);
  e.append(...hijos.filter(h => h !== null && h !== undefined && h !== false));
  return e;
}

const ICONOS_PERSONAJE = {
  explorador: `<svg viewBox="0 0 80 100" aria-hidden="true"><rect x="22" y="42" width="36" height="46" rx="18" fill="#f2a541"/><circle cx="40" cy="30" r="17" fill="#f6d1b0"/><circle cx="34" cy="30" r="2.5" fill="#111"/><circle cx="46" cy="30" r="2.5" fill="#111"/></svg>`,
  cientifica: `<svg viewBox="0 0 80 100" aria-hidden="true"><path d="M40 40 L64 92 L16 92 Z" fill="#eef3f0"/><circle cx="40" cy="30" r="17" fill="#c98f6b"/><path d="M23 28 A17 17 0 0 1 57 28 Z" fill="#3b2316"/><circle cx="34" cy="32" r="2.5" fill="#111"/><circle cx="46" cy="32" r="2.5" fill="#111"/></svg>`,
  robot: `<svg viewBox="0 0 80 100" aria-hidden="true"><rect x="20" y="46" width="40" height="44" rx="4" fill="#9fb6c3"/><rect x="25" y="20" width="30" height="24" rx="3" fill="#7f97a5"/><line x1="40" y1="8" x2="40" y2="20" stroke="#9fb6c3" stroke-width="3"/><circle cx="40" cy="7" r="4" fill="#7cf03c"/><circle cx="34" cy="31" r="2.5" fill="#111"/><circle cx="46" cy="31" r="2.5" fill="#111"/></svg>`,
};

export class Vista {
  constructor(ctx) {
    this.ctx = ctx;
    this.mundo = new Mundo3D($("#escena"), {
      alTocarPortal: d => this.ctx.c.viajarPorPortal.ejecutar(d),
      alTocarCristal: n => this.ctx.c.interactuarConObjeto.ejecutar(n),
      alTocarRegreso: () => this.ctx.c.viajarPorPortal.volverAlGaraje(),
      alPisarCharco: () => this.ctx.c.interactuarConObjeto.pisarCharco(),
    });
    this.audio = null;
    this.personajeElegido = null;
    this.#conectar();
    this.#joystick();
    // Componentes propios en vez de los del navegador: menús, edad con − y +, avisos de error y descripciones.
    this.#stepper($("#edad"));
    this.#stepper($("#mat-edad"));
    this.#mejorarSelects(document);
    this.#descripciones();
    document.addEventListener("input", e => this.#limpiarError(e.target));
  }

  // ======== Pantallas ========
  #pantalla(id) {
    for (const p of document.querySelectorAll(".pantalla")) p.hidden = p.id !== id;
    const jugando = id === null;
    $("#hud").hidden = !jugando;
    $("#rick").hidden = !jugando;
    $("#palanca").hidden = !jugando;
    $("#btn-saltar").hidden = !jugando;
    this.mundo.activo = jugando;
  }

  irAlInicio() {
    this.cerrarReto();
    this.#cerrarModales();
    this.mundo.mostrarGaraje(this.ctx.dimensiones);
    this.mundo.activo = false;
    $("#nombre").value = "";
    this.#pantalla("inicio");
  }

  mostrarPersonajes(personajes) {
    const lista = $("#lista-personajes");
    lista.innerHTML = "";
    this.personajeElegido = this.ctx.jugador.personaje
      ? personajes.find(p => p.tipo === this.ctx.jugador.personaje.tipo) ?? personajes[0]
      : personajes[0];
    if (this.ctx.jugador.personaje) this.personajeElegido.accesorios = [...this.ctx.jugador.personaje.accesorios];
    for (const p of personajes) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tarjeta-personaje";
      b.setAttribute("aria-pressed", String(p === this.personajeElegido));
      b.innerHTML = `${ICONOS_PERSONAJE[p.tipo]}<span>${p.nombre}</span>`;
      b.addEventListener("click", () => {
        this.personajeElegido = p;
        lista.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        this.ctx.c.elegirPersonaje.ejecutar(p);
        this.#pintarAccesorios();
      });
      lista.append(b);
    }
    this.ctx.c.elegirPersonaje.ejecutar(this.personajeElegido);
    this.#pintarAccesorios();
    this.#pantalla("personajes");
  }

  #pintarAccesorios() {
    const caja = $("#accesorios");
    caja.innerHTML = "";
    for (const a of ACCESORIOS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = a[0].toUpperCase() + a.slice(1);
      b.setAttribute("aria-pressed", String(this.personajeElegido.accesorios.includes(a)));
      b.addEventListener("click", () => {
        this.ctx.c.personalizarPersonaje.ejecutar(this.personajeElegido, a);
        b.setAttribute("aria-pressed", String(this.personajeElegido.accesorios.includes(a)));
      });
      caja.append(b);
    }
  }

  actualizarAvatar(personaje) {
    this.mundo.construirAvatar(personaje);
  }

  irAlGaraje() {
    this.cerrarReto();
    this.mundo.mostrarGaraje(this.ctx.dimensiones, this.ctx.c.verLogros.estadoDimensiones());
    this.#pantalla(null);
    this.actualizarHUD();
    $("#lugar").textContent = "Garaje de Rick";
    this.decir(`Garaje de Rick. Camina hasta un portal, ${this.ctx.jugador.nombre}.`);
  }

  irADimension(d) {
    this.mundo.mostrarDimension(d, this.ctx.c.verLogros.estadoDimensiones()[this.ctx.dimensiones.indexOf(d)]);
    $("#lugar").textContent = d.nombre;
  }

  refrescarPortales() {
    if (this.ctx.jugador && !this.ctx.jugador.dimensionActual && this.mundo.activo) this.mundo.mostrarGaraje(this.ctx.dimensiones, this.ctx.c.verLogros.estadoDimensiones());
  }

  // Vuelve a dibujar la dimensión (para que se vean las estrellas nuevas), sin mover al jugador.
  refrescarDimension() {
    const d = this.ctx.jugador?.dimensionActual;
    if (!d) return;
    const pos = this.mundo.jugador.position.clone();
    setTimeout(() => {
      if (this.ctx.jugador?.dimensionActual !== d || this.ctx.jugador.nivelActual) return;
      this.irADimension(d);
      this.mundo.jugador.position.copy(pos);
      this.mundo.jugador.position.y = 0;
    }, 1600);
  }

  // ======== IA ========
  cargandoRetos(activo) {
    $("#cargando-ia").hidden = !activo;
    if (activo) this.decir("Dame un segundo… estoy inventando retos nuevos solo para ti.");
  }

  estadoIA(estado) {
    const p = $("#estado-ia");
    const textos = { sample: "Rick IA", servidor: "Rick IA", "sin-ia": "Retos locales", buscando: "Conectando IA…" };
    p.textContent = textos[estado] ?? estado;
    p.dataset.estado = estado;
    p.title = estado === "sin-ia"
      ? "No hay IA disponible: Rick usa los generadores del juego."
      : "Rick inventa retos nuevos con inteligencia artificial.";
  }

  // ======== Guardián ========
  mostrarJefe(vidas) { this.mundo.mostrarJefe(vidas); }
  golpearJefe(vida, max, limpio) { this.mundo.golpearJefe(vida, max, limpio); this.sonido("premio"); }
  derrotarJefe() { this.mundo.derrotarJefe(); this.#confeti(120); }
  ocultarJefe() { this.mundo.ocultarJefe(); }

  // ======== Inventos del mundo ========
  alternarEfecto(efecto) {
    const activo = this.mundo.alternarEfecto(efecto);
    this.#pintarEfectos();
    return activo;
  }

  encoger() { this.mundo.encoger(); }

  #pintarEfectos() {
    const caja = $("#efectos");
    caja.innerHTML = "";
    const nombres = { saltar: "Botas", velocidad: "Propulsor", estela: "Estela" };
    for (const e of this.mundo.efectos ?? []) {
      const s = document.createElement("span");
      s.className = "efecto";
      s.textContent = nombres[e] ?? e;
      caja.append(s);
    }
    caja.hidden = caja.childElementCount === 0;
  }

  // ======== Mapa del multiverso ========
  mostrarMapa(estados, inventos) {
    const total = estados.reduce((a, e) => a + e.total + 1, 0);
    const hechos = estados.reduce((a, e) => a + e.completados + (e.jefeVencido ? 1 : 0), 0);
    $("#mapa-porcentaje").textContent = `${total ? Math.round((hechos / total) * 100) : 0}%`;
    $("#mapa-barra").style.width = `${total ? (hechos / total) * 100 : 0}%`;
    $("#mapa-nodos").innerHTML = estados.map(e => `
      <li class="nodo ${e.abierta ? "" : "cerrado"} ${e.jefeVencido ? "dominado" : ""}" data-materia="${e.materia}">
        <span class="nodo-orbe" aria-hidden="true"></span>
        <span class="nodo-texto">
          <strong>${escapar(e.nombre)}</strong>
          <span class="nodo-niveles">${e.niveles.map(n => `<i class="${n.completo ? "hecho" : ""}" title="Nivel ${n.numero}">${n.numero}</i>`).join("")}
            <i class="jefe ${e.jefeVencido ? "hecho" : e.jefeDespierto ? "despierto" : ""}" title="Guardián">G</i></span>
          <small>${!e.abierta ? "Bloqueada: necesitas 30 de energía" : e.jefeVencido ? "¡Dimensión dominada!" : e.jefeDespierto ? "¡El guardián despertó! Ve a vencerlo." : `${e.completados} de ${e.total} niveles · completa todos para despertar al guardián`}</small>
        </span>
      </li>`).join("");
    const legendarios = inventos.filter(i => ["saltar", "velocidad", "estela"].includes(i.efecto));
    $("#mapa-legendarios").textContent = legendarios.length
      ? `Inventos legendarios: ${legendarios.map(i => i.nombre).join(", ")}`
      : "Vence a un guardián para ganar un invento legendario que cambia el mundo.";
    $("#modal-mapa").hidden = false;
  }

  // ======== HUD y Rick ========
  actualizarHUD() {
    const j = this.ctx.jugador;
    if (!j) return;
    $("#hud-nombre").textContent = j.nombre;
    const e = j.portal.energia;
    $("#energia-barra").style.width = `${e}%`;
    $("#energia-valor").textContent = e;
    $("#energia").setAttribute("aria-valuenow", String(e));
    $("#hud-retos").textContent = j.progreso.retosCompletados;
    $("#hud-inventos").textContent = j.inventos.length;
  }

  decir(texto) {
    const burbuja = $("#rick-texto");
    const esMorty = texto.startsWith("Morty:");
    $("#rick-quien").textContent = esMorty ? "MORTY" : "RICK";
    $("#rick").dataset.quien = esMorty ? "morty" : "rick";
    burbuja.textContent = esMorty ? texto.replace("Morty: ", "") : texto;
    // Mientras hay un reto abierto, lo que dice Rick aparece dentro del panel del reto.
    $("#reto-rick").textContent = `${esMorty ? "Morty" : "Rick"}: ${burbuja.textContent}`;
    $("#rick").classList.remove("pulso");
    void $("#rick").offsetWidth;
    $("#rick").classList.add("pulso");
    if (this.ctx.jugador?.opciones.voz) this.hablar(burbuja.textContent);
  }

  hablar(texto, forzar = false) {
    if (!("speechSynthesis" in window)) return;
    if (!forzar && !this.ctx.jugador?.opciones.voz) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "es-ES";
      u.rate = 1.05;
      speechSynthesis.speak(u);
    } catch { /* sin voz */ }
  }

  sonido(tipo, racha = 0) {
    if (this.ctx.jugador && !this.ctx.jugador.opciones.sonido) return;
    try {
      this.audio ??= new AudioContext();
      const notas = { acierto: [660, 880], error: [220, 180], premio: [523, 659, 784, 1046], portal: [300, 600], invento: [880, 1320] }[tipo] ?? [440];
      notas.forEach((f, i) => {
        const o = this.audio.createOscillator();
        const g = this.audio.createGain();
        o.type = tipo === "error" ? "sawtooth" : "triangle";
        o.frequency.value = tipo === "acierto" ? f * (1 + Math.min(racha, 8) * 0.06) : f;
        const t0 = this.audio.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g).connect(this.audio.destination);
        o.start(t0);
        o.stop(t0 + 0.2);
      });
    } catch { /* sin audio */ }
  }

  // ======== Retos ========
  mostrarReto(reto, nivel, info = {}) {
    const panel = $("#reto");
    panel.hidden = false;
    $("#rick").hidden = true;
    $("#reto-explicacion").hidden = true;
    const armar = esDeArmar(reto);
    const estrellas = "★".repeat(info.dificultad ?? 1) + "☆".repeat(5 - (info.dificultad ?? 1));
    $("#reto-avance").textContent = `Reto ${Math.min((info.avance ?? 0) + 1, info.total ?? 5)} de ${info.total ?? 5}`;
    $("#reto-dificultad").textContent = estrellas;
    $("#reto-dificultad").title = `Dificultad ${info.dificultad} de 5`;
    $("#reto-repaso").hidden = !info.esRepaso;
    $("#reto-ia").hidden = !info.ia;
    $("#reto-rick").textContent = info.esRepaso
      ? "Rick: Este lo fallaste antes. ¡Ahora sí te sale!"
      : armar ? "Rick: Corre y atrapa las letras en orden." : "Rick: Corre hacia el orbe de la respuesta, o tócala aquí.";

    // Pregunta: en Lectura (y en los mundos del profe) cada palabra se puede tocar para oírla.
    const preg = $("#reto-pregunta");
    preg.innerHTML = "";
    if (info.materia === "lectura" || info.materia === "material") {
      for (const parte of reto.pregunta.split(/(\s+)/)) {
        if (!parte.trim()) { preg.append(parte); continue; }
        const b = document.createElement("button");
        b.type = "button";
        b.className = "palabra";
        b.textContent = parte;
        b.addEventListener("click", () => this.hablar(parte.replace(/[«».,¿?¡!:]/g, ""), true));
        preg.append(b);
      }
      $("#reto-ayuda-lectura").hidden = false;
    } else {
      preg.textContent = reto.pregunta;
      $("#reto-ayuda-lectura").hidden = true;
    }

    const caja = $("#reto-opciones");
    caja.innerHTML = "";
    caja.hidden = armar;
    if (armar) {
      const clave = reto.pregunta.split(":")[0];
      this.mundo.mostrarLetras(reto.opciones, clave, l => this.ctx.c.jugarNivel.responder(l));
    } else {
      reto.opciones.forEach((op, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opcion";
        b.dataset.letra = LETRAS[i];
        b.innerHTML = `<span class="letra">${LETRAS[i]}</span><span></span>`;
        b.lastChild.textContent = op;
        b.addEventListener("click", () => this.ctx.c.jugarNivel.responder(LETRAS[i]));
        caja.append(b);
      });
      this.mundo.mostrarOrbes(reto.opciones.map((texto, i) => ({ clave: LETRAS[i], texto })), l => this.ctx.c.jugarNivel.responder(l));
      // Material para contar en Matemáticas (números pequeños).
      const m = reto.pregunta.match(/(\d+)\s*([+−])\s*(\d+)/);
      if (info.materia === "matematicas" && m && +m[1] <= 10 && +m[3] <= 10) this.mundo.mostrarMaterial(+m[1], +m[3], m[2] === "+" ? "+" : "-");
    }
    this.#pintarInventosReto();
    this.mundo.pausado = this.ctx.jugador.pausado;   // el jugador corre para responder
  }

  mostrarExplicacion(reto, texto) {
    $("#reto-explicacion-texto").textContent = texto;
    $("#reto-explicacion").hidden = false;
    if (esDeArmar(reto)) {
      this.mundo.marcar(reto.respuestaCorrecta, true);
    } else {
      document.querySelector(`#reto-opciones [data-letra="${reto.respuestaCorrecta}"]`)?.classList.add("bien");
      document.querySelectorAll("#reto-opciones button").forEach(x => { x.disabled = true; });
      this.mundo.marcar(reto.respuestaCorrecta, true);
    }
  }

  actualizarRacha(racha, multiplicador) {
    const p = $("#racha");
    p.hidden = racha < 2;
    $("#racha-valor").textContent = racha;
    $("#racha-multi").textContent = multiplicador > 1 ? `×${multiplicador} energía` : "";
    p.dataset.nivel = String(multiplicador);
    p.classList.remove("pulso");
    void p.offsetWidth;
    p.classList.add("pulso");
  }

  reaccion(tipo, racha = 0) {
    this.mundo.reaccion(tipo, racha);
  }

  letrasEnMundo() {
    return this.mundo.letrasActuales();
  }

  #pintarInventosReto() {
    const caja = $("#reto-inventos");
    caja.innerHTML = "";
    const inventos = this.ctx.jugador.inventos;
    $("#reto-inventos-titulo").hidden = inventos.length === 0;
    for (const inv of inventos) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip invento";
      b.title = inv.descripcion;
      b.textContent = inv.nombre;
      b.addEventListener("click", () => {
        if (this.ctx.c.usarInvento.ejecutar(inv)) b.disabled = true;
      });
      caja.append(b);
    }
  }

  marcarRespuesta(letra, correcta, reto) {
    this.mundo.marcar(letra, correcta);
    if (reto && esDeArmar(reto)) return;
    const b = document.querySelector(`#reto-opciones [data-letra="${letra}"]`);
    if (!b) return;
    b.classList.add(correcta ? "bien" : "mal");
    if (correcta) {
      document.querySelectorAll("#reto-opciones button").forEach(x => { x.disabled = true; });
      this.#confeti(14);
    } else {
      setTimeout(() => b.classList.remove("mal"), 600);
    }
  }

  ocultarOpcion(letra) {
    this.mundo.quitar(letra);
    const b = document.querySelector(`#reto-opciones [data-letra="${letra}"]`);
    if (b) { b.classList.add("encogida"); b.disabled = true; }
  }

  opcionOculta(letra) {
    return document.querySelector(`#reto-opciones [data-letra="${letra}"]`)?.classList.contains("encogida") ?? false;
  }

  cerrarReto() {
    $("#reto").hidden = true;
    this.mundo.limpiarReto(true);
    $("#rick").hidden = !this.mundo.activo;
    this.mundo.pausado = this.ctx.jugador?.pausado ?? false;
  }

  mostrarRecompensa(invento, esNuevo, logros) {
    setTimeout(() => {
      this.cerrarReto();
      $("#premio-nombre").textContent = invento.nombre;
      $("#premio-descripcion").textContent = invento.descripcion;
      $("#premio-nuevo").textContent = esNuevo ? "Invento nuevo para tu colección" : "Ya lo tenías: ¡pero ganaste el nivel otra vez!";
      $("#premio-logros").textContent = logros.length ? `Logro: ${logros.map(l => l.nombre).join(", ")}` : "";
      $("#modal-premio").hidden = false;
      $("#premio-ok").focus();
      this.#confeti(80);
    }, 700);
  }

  anunciarLogro(logro) {
    this.anunciar(`Logro: ${logro.nombre}`, logro.descripcion);
  }

  anunciar(titulo, texto) {
    const t = document.createElement("div");
    t.className = "aviso";
    t.innerHTML = `<strong></strong><span></span>`;
    t.querySelector("strong").textContent = titulo;
    t.querySelector("span").textContent = texto;
    $("#avisos").append(t);
    setTimeout(() => t.remove(), 3800);
  }

  // ======== Menús ========
  mostrarPausa(pausado) {
    this.mundo.pausado = pausado || !$("#reto").hidden;
    $("#modal-pausa").hidden = !pausado;
    if (pausado) $("#pausa-continuar").focus();
  }

  mostrarLogros(logros, inventos, mision, progreso) {
    $("#lista-logros").innerHTML = logros.map(l => `
      <li class="${l.fecha ? "ganado" : ""}">
        <span class="medalla" aria-hidden="true">${l.fecha ? "★" : "☆"}</span>
        <span><strong>${escapar(l.nombre)}</strong><small>${escapar(l.descripcion)}${l.fecha ? ` · ${new Date(l.fecha).toLocaleDateString("es-CO")}` : ""}</small></span>
      </li>`).join("");
    const deMundo = ["saltar", "velocidad", "estela"];
    $("#lista-inventos").innerHTML = inventos.length
      ? inventos.map((i, k) => `<li class="${deMundo.includes(i.efecto) ? "legendario" : ""}"><span><strong>${escapar(i.nombre)}</strong><small>${escapar(i.descripcion)}</small></span>${deMundo.includes(i.efecto)
        ? `<button type="button" class="boton chico" data-invento="${k}">${this.mundo.tieneEfecto(i.efecto) ? "Apagar" : "Activar"}</button>` : ""}</li>`).join("")
      : `<li class="vacio">Termina un nivel para ganar tu primer invento.</li>`;
    $("#lista-inventos").querySelectorAll("[data-invento]").forEach(b => b.addEventListener("click", () => {
      const inv = inventos[Number(b.dataset.invento)];
      const activo = this.ctx.c.usarInvento.alternarEfecto(inv);
      b.textContent = activo ? "Apagar" : "Activar";
    }));
    $("#mision-texto").textContent = `${mision.descripcion}: ${mision.completada ? "¡completada!" : "pendiente"}`;
    $("#logros-retos").textContent = progreso.retosCompletados;
    $("#modal-logros").hidden = false;
  }

  #mostrarOpciones() {
    const { jugador, tutor } = this.ctx;
    $("#op-sonido").checked = jugador.opciones.sonido;
    $("#op-voz").checked = jugador.opciones.voz;
    $("#op-demo").checked = jugador.opciones.modoDemo;
    $("#tutor-nombre").value = tutor.nombre;
    $("#tutor-correo").value = tutor.correo;
    $("#tutor-parentesco").value = tutor.parentesco || "madre";
    $("#tutor-parentesco").refrescar?.();
    $("#modal-opciones").hidden = false;
  }

  #mostrarReporte() {
    const texto = this.ctx.c.enviarReporteProgreso.ejecutar();
    const t = this.ctx.tutor;
    $("#reporte-para").textContent = t.nombre ? `Para: ${t.nombre}${t.parentesco ? ` (${t.parentesco})` : ""}${t.correo ? ` · ${t.correo}` : ""}` : "Agrega los datos del tutor en Opciones.";
    $("#reporte-texto").textContent = texto;
    $("#modal-reporte").hidden = false;
  }

  // Panel de reglas de la dimensión (como en el Motor del Multiverso).
  mostrarReglas(nombre, reglas) {
    $("#reglas-titulo").textContent = `Reglas · ${nombre}`;
    const ul = $("#lista-reglas");
    ul.innerHTML = "";
    for (const r of reglas) {
      const li = document.createElement("li");
      li.textContent = r;
      ul.append(li);
    }
    $("#modal-reglas").hidden = false;
  }

  #cerrarModales() {
    document.querySelectorAll(".modal").forEach(m => { m.hidden = true; });
  }

  // ======== Admin (CRUD) ========
  #pintarAdmin() {
    const { dimensiones } = this.ctx;
    const raiz = $("#admin-contenido");
    raiz.innerHTML = "";
    dimensiones.forEach((d, di) => {
      const sec = document.createElement("section");
      sec.className = "admin-dim";
      sec.innerHTML = `
        <div class="admin-fila">
          <input id="dim-nombre-${di}" aria-label="Nombre de la dimensión" value="${escapar(d.nombre)}">
          <select id="dim-materia-${di}" aria-label="Materia">
            ${["lectura", "matematicas", "escritura", "material"].map(m => `<option value="${m}" ${m === d.materia ? "selected" : ""}>${m === "material" ? "material (solo aprobadas)" : m}</option>`).join("")}
          </select>
          <label class="interruptor"><input type="checkbox" id="dim-abierta-${di}" ${d.desbloqueada ? "checked" : ""}> Abierta</label>
          <button type="button" class="boton chico" data-accion="guardar-dim">Guardar</button>
          <button type="button" class="boton chico secundario" data-accion="exportar-dim" title="Descarga este mundo para abrirlo en otro computador">Exportar mundo</button>
          <button type="button" class="boton chico peligro" data-accion="borrar-dim">Eliminar</button>
        </div>`;
      sec.querySelector('[data-accion="exportar-dim"]').addEventListener("click", () => {
        this.ctx.c.administrarDimensiones.exportarMundo(di);
        this.anunciar("Mundo exportado", "Ábrelo en otro computador con «Importar mundo».");
      });
      sec.querySelector('[data-accion="guardar-dim"]').addEventListener("click", () => {
        this.ctx.c.administrarDimensiones.ejecutar(dimensiones, "editar", {
          nombre: $(`#dim-nombre-${di}`).value.trim() || d.nombre,
          materia: $(`#dim-materia-${di}`).value,
          desbloqueada: $(`#dim-abierta-${di}`).checked,
        }, di);
        this.anunciar("Guardado", d.nombre);
      });
      sec.querySelector('[data-accion="borrar-dim"]').addEventListener("click", () => this.#confirmar(`Se borrará «${d.nombre}» con todos sus niveles y retos. No se puede deshacer.`, () => {
        this.ctx.c.administrarDimensiones.ejecutar(dimensiones, "eliminar", {}, di);
        this.#pintarAdmin();
      }));

      d.niveles.forEach((n, ni) => {
        const niv = document.createElement("details");
        niv.className = "admin-nivel";
        niv.innerHTML = `<summary>Nivel ${n.numero} · ${escapar(n.dificultad)} · ${n.retos.length} retos</summary>`;
        n.retos.forEach((r, ri) => {
          const fila = document.createElement("div");
          fila.className = "admin-reto";
          fila.innerHTML = `
            <p>${escapar(r.pregunta)}</p>
            <small>${r.opciones.map((o, i) => `${LETRAS[i]}) ${escapar(o)}`).join(" · ")} — correcta: ${escapar(r.respuestaCorrecta)}</small>
            ${r.fuente ? `<small class="cita">Del material: «${escapar(r.fuente)}»</small>` : ""}
            <button type="button" class="boton chico peligro">Eliminar reto</button>`;
          fila.querySelector("button").addEventListener("click", () => this.#confirmar(`Se borrará el reto «${r.pregunta.slice(0, 90)}».`, () => {
            this.ctx.c.administrarRetos.ejecutar(n, "eliminar", {}, ri);
            this.#pintarAdmin();
          }));
          niv.append(fila);
        });
        const form = document.createElement("form");
        form.className = "admin-nuevo-reto";
        form.noValidate = true;
        const id = `${di}-${ni}`;
        form.innerHTML = `
          <strong>Nuevo reto</strong>
          <input id="nr-pregunta-${id}" required placeholder="Pregunta" aria-label="Pregunta" data-error="Escribe la pregunta.">
          <div class="admin-fila">
            <input id="nr-a-${id}" required placeholder="Opción A" aria-label="Opción A" data-error="Escribe la opción A.">
            <input id="nr-b-${id}" required placeholder="Opción B" aria-label="Opción B" data-error="Escribe la opción B.">
            <input id="nr-c-${id}" required placeholder="Opción C" aria-label="Opción C" data-error="Escribe la opción C.">
            <select id="nr-correcta-${id}" aria-label="Respuesta correcta"><option>A</option><option>B</option><option>C</option></select>
          </div>
          <input id="nr-pista-${id}" required placeholder="Pista" aria-label="Pista" data-error="Escribe una pista que ayude sin decir la respuesta.">
          <div class="admin-fila">
            <button class="boton chico">Agregar reto</button>
            <button type="button" class="boton chico peligro" data-accion="borrar-nivel">Eliminar nivel</button>
          </div>`;
        form.addEventListener("submit", e => {
          e.preventDefault();
          if (!this.#validar(form)) return;
          this.ctx.c.administrarRetos.ejecutar(n, "crear", {
            pregunta: $(`#nr-pregunta-${id}`).value.trim(),
            opciones: ["a", "b", "c"].map(x => $(`#nr-${x}-${id}`).value.trim()),
            respuestaCorrecta: $(`#nr-correcta-${id}`).value,
            pista: $(`#nr-pista-${id}`).value.trim(),
          });
          this.#pintarAdmin();
        });
        form.querySelector('[data-accion="borrar-nivel"]').addEventListener("click", () => this.#confirmar(`Se borrará el nivel ${n.numero} con sus ${n.retos.length} retos.`, () => {
          this.ctx.c.administrarNiveles.ejecutar(d, "eliminar", {}, ni);
          this.#pintarAdmin();
        }));
        niv.append(form);
        sec.append(niv);
      });
      const nuevoNivel = document.createElement("button");
      nuevoNivel.type = "button";
      nuevoNivel.className = "boton chico";
      nuevoNivel.textContent = "Agregar nivel";
      nuevoNivel.addEventListener("click", () => {
        this.ctx.c.administrarNiveles.ejecutar(d, "crear", { dificultad: "medio" });
        this.#pintarAdmin();
      });
      sec.append(nuevoNivel);
      raiz.append(sec);
    });
    this.#mejorarSelects(raiz);
  }

  // ======== Admin: crear un mundo desde material (IA) ========
  // La vista solo muestra y junta lo que edita el profe; revisar y crear lo hace CrearDimensionDesdeMaterialControlador.
  #abrirMaterial() {
    $("#mat-estado").hidden = true;
    $("#mat-error").hidden = true;
    this.#contarMaterial();
    this.#pantalla("admin-material");
    $("#mat-tema").focus();
  }

  #contarMaterial() {
    const max = this.ctx.c.crearDimensionDesdeMaterial.constructor.MAX_CARACTERES;
    const n = $("#mat-texto").value.trim().length;
    $("#mat-contador").textContent = `${n.toLocaleString("es-CO")} / ${max.toLocaleString("es-CO")} caracteres`;
    $("#mat-contador").classList.toggle("error", n > max);
  }

  #estadoMaterial(texto, tipo = "info") {
    const p = $("#mat-estado");
    p.hidden = !texto;
    p.className = tipo === "error" ? "error" : "";
    p.replaceChildren(...(tipo === "cargando" ? [el("span", { className: "giro", ariaHidden: "true" })] : []), texto ?? "");
  }

  // Pasa cada archivo a texto (lo hace el controlador) y lo agrega al cuadro para que el profe lo revise.
  async #cargarArchivos(archivos) {
    if (!archivos.length) return;
    const boton = $("#mat-generar");
    boton.disabled = true;
    const mensajes = [];
    let huboError = false;
    for (const archivo of archivos) {
      this.#estadoMaterial(`Leyendo «${archivo.name}»… (las fotos y los PDF escaneados los lee la IA y tardan un poco más)`, "cargando");
      try {
        const { texto, mensaje } = await this.ctx.c.crearDimensionDesdeMaterial.leerArchivo(archivo);
        const actual = $("#mat-texto").value.trim();
        $("#mat-texto").value = actual ? `${actual}\n\n${texto}` : texto;
        if (!$("#mat-tema").value.trim()) $("#mat-tema").value = archivo.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        mensajes.push(mensaje);
      } catch (e) {
        huboError = true;
        mensajes.push(e.message);
      }
    }
    this.#contarMaterial();
    const max = this.ctx.c.crearDimensionDesdeMaterial.constructor.MAX_CARACTERES;
    const largo = $("#mat-texto").value.trim().length;
    if (largo > max) {
      huboError = true;
      mensajes.push(`Ahora el material tiene ${largo.toLocaleString("es-CO")} caracteres y el máximo es ${max.toLocaleString("es-CO")}: deja solo la parte de la lección que quieres usar.`);
    }
    this.#estadoMaterial(mensajes.join("\n"), huboError ? "error" : "info");
    boton.disabled = false;
  }

  async #pedirPropuestas() {
    const boton = $("#mat-generar");
    boton.disabled = true;
    $("#mat-revision").hidden = true;
    this.#estadoMaterial("Rick está leyendo tu material y comprobando cada pregunta… puede tardar hasta un minuto.", "cargando");
    try {
      const { aceptadas, descartadas } = await this.ctx.c.crearDimensionDesdeMaterial.proponer($("#mat-texto").value, Number($("#mat-edad").value));
      this.propuestas = aceptadas.map(p => ({ ...p, opciones: [...p.opciones], estado: "pendiente" }));
      this.#estadoMaterial(aceptadas.length ? "" : "Ninguna pregunta pasó la revisión. Prueba con un texto más claro o más largo.", aceptadas.length ? "info" : "error");
      this.#pintarPropuestas(descartadas);
    } catch (e) {
      this.#estadoMaterial(e.message, "error");
    } finally {
      boton.disabled = false;
    }
  }

  #pintarPropuestas(descartadas = []) {
    const caja = $("#mat-propuestas");
    caja.replaceChildren();
    const actualizar = () => {
      const n = this.propuestas.filter(p => p.estado === "aprobada").length;
      $("#mat-resumen").textContent = `${this.propuestas.length} preguntas propuestas · ${n} aprobadas`;
      $("#mat-crear").textContent = `Crear mundo con ${n} preguntas`;
      $("#mat-crear").disabled = n < 3;
    };
    this.propuestas.forEach((p, k) => {
      const tarjeta = el("article", { className: "propuesta" });
      const aprobar = el("button", { type: "button", className: "chip", textContent: "✓ Aprobar" });
      const descartar = el("button", { type: "button", className: "chip", textContent: "✗ Descartar" });
      const marcar = estado => {
        p.estado = p.estado === estado ? "pendiente" : estado;
        tarjeta.classList.toggle("aprobada", p.estado === "aprobada");
        tarjeta.classList.toggle("descartada", p.estado === "descartada");
        aprobar.setAttribute("aria-pressed", String(p.estado === "aprobada"));
        descartar.setAttribute("aria-pressed", String(p.estado === "descartada"));
        actualizar();
      };
      p.marcar = marcar;
      aprobar.addEventListener("click", () => marcar("aprobada"));
      descartar.addEventListener("click", () => marcar("descartada"));

      const nivel = el("select", { ariaLabel: `Nivel de la pregunta ${k + 1}` },
        ...[[1, "Nivel 1 · fácil"], [2, "Nivel 2 · medio"], [3, "Nivel 3 · difícil"]].map(([v, t]) => el("option", { value: v, textContent: t, selected: p.nivel === v })));
      nivel.value = String(p.nivel);
      nivel.addEventListener("change", () => { p.nivel = Number(nivel.value); });

      const pregunta = el("input", { type: "text", value: p.pregunta, ariaLabel: `Pregunta ${k + 1}` });
      pregunta.addEventListener("input", () => { p.pregunta = pregunta.value; });

      const opciones = p.opciones.map((texto, i) => {
        const radio = el("input", { type: "radio", name: `correcta-${k}`, checked: p.correcta === i, ariaLabel: `La ${LETRAS[i]} es la correcta` });
        radio.addEventListener("change", () => { p.correcta = i; });
        const campo = el("input", { type: "text", value: texto, ariaLabel: `Opción ${LETRAS[i]}` });
        campo.addEventListener("input", () => { p.opciones[i] = campo.value; });
        return el("div", { className: "opcion-edit" }, radio, el("strong", { textContent: LETRAS[i] }), campo);
      });

      const pista = el("input", { type: "text", value: p.pista, ariaLabel: `Pista ${k + 1}` });
      pista.addEventListener("input", () => { p.pista = pista.value; });

      tarjeta.append(
        el("div", { className: "fila" }, el("strong", { textContent: `Pregunta ${k + 1}` }), nivel, el("span", { className: "espacio" }), aprobar, descartar),
        pregunta,
        el("small", { className: "rotulo", textContent: "Opciones (marca la correcta)" }),
        ...opciones,
        el("label", { className: "campo-linea" }, "Pista (no debe decir la respuesta)", pista),
        el("p", { className: "cita", textContent: `Del material: «${p.cita}»` }),
      );
      if (p.avisos.length) tarjeta.append(el("ul", { className: "avisos" }, ...p.avisos.map(a => el("li", { textContent: a }))));
      caja.append(tarjeta);
    });
    this.#mejorarSelects(caja);

    const det = $("#mat-descartadas");
    det.hidden = descartadas.length === 0;
    det.querySelector("summary").textContent = `${descartadas.length} propuestas descartadas porque no salían bien del material`;
    det.querySelector("ul").replaceChildren(...descartadas.map(d => el("li", {},
      el("span", {}, el("strong", { textContent: d.pregunta }), el("small", { textContent: d.motivo })))));
    $("#mat-error").hidden = true;
    $("#mat-revision").hidden = this.propuestas.length === 0 && descartadas.length === 0;
    actualizar();
  }

  #crearMundo() {
    const aprobadas = (this.propuestas ?? []).filter(p => p.estado === "aprobada");
    try {
      const d = this.ctx.c.crearDimensionDesdeMaterial.ejecutar($("#mat-tema").value, aprobadas);
      this.anunciar("Mundo creado", `${d.nombre}: ${aprobadas.length} preguntas aprobadas.`);
      this.propuestas = [];
      $("#form-material").reset();
      $("#mat-revision").hidden = true;
      this.#pintarAdmin();
      this.#pantalla("admin");
    } catch (e) {
      $("#mat-error").textContent = e.message;
      $("#mat-error").hidden = false;
    }
  }

  // ======== Componentes propios (en vez de los del navegador) ========

  // Diálogo del juego, en vez de alert/confirm del navegador. Devuelve una promesa: true si acepta.
  dialogo({ titulo, texto = "", aceptar = "Aceptar", cancelar = null, peligro = false }) {
    const modal = $("#modal-dialogo"), si = $("#dialogo-aceptar"), no = $("#dialogo-cancelar");
    const foco = document.activeElement;
    $("#dialogo-titulo").textContent = titulo;
    $("#dialogo-texto").textContent = texto;
    si.textContent = aceptar;
    si.classList.toggle("peligro", peligro);
    no.textContent = cancelar ?? "";
    no.hidden = !cancelar;
    modal.hidden = false;
    (peligro && cancelar ? no : si).focus();   // si es para borrar, el foco empieza en "Cancelar"
    return new Promise(resolver => {
      const cerrar = valor => {
        modal.hidden = true;
        si.removeEventListener("click", alSi);
        no.removeEventListener("click", alNo);
        modal.removeEventListener("keydown", alTecla);
        modal.removeEventListener("click", alFondo);
        foco?.focus?.();
        resolver(valor);
      };
      const alSi = () => cerrar(true);
      const alNo = () => cerrar(false);
      const alFondo = e => { if (e.target === modal) cerrar(false); };
      const alTecla = e => {
        if (e.key === "Escape") { e.stopPropagation(); cerrar(false); }
        if (e.key === "Tab") {   // el foco se queda dentro del diálogo
          const botones = [no, si].filter(b => !b.hidden);
          e.preventDefault();
          botones[(botones.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + botones.length) % botones.length].focus();
        }
      };
      si.addEventListener("click", alSi);
      no.addEventListener("click", alNo);
      modal.addEventListener("keydown", alTecla);
      modal.addEventListener("click", alFondo);
    });
  }

  // Antes de borrar algo, pregunta con el diálogo del juego.
  async #confirmar(texto, accion) {
    if (await this.dialogo({ titulo: "¿Eliminar?", texto, aceptar: "Eliminar", cancelar: "Cancelar", peligro: true })) accion();
  }

  // Revisa un formulario y muestra los errores con el estilo del juego (en vez de las burbujas del navegador).
  #validar(form) {
    let primero = null;
    for (const campo of form.querySelectorAll("input, textarea")) {
      this.#limpiarError(campo);
      const v = campo.value.trim();
      let error = "";
      if (campo.required && !v) error = campo.dataset.error || "Completa este campo.";
      else if (v && campo.type === "number" && !(Number(v) >= Number(campo.min) && Number(v) <= Number(campo.max))) error = campo.dataset.error || `Escribe un número entre ${campo.min} y ${campo.max}.`;
      else if (v && campo.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) error = campo.dataset.error || "Escribe un correo válido.";
      if (!error) continue;
      const burbuja = el("p", { className: "burbuja", textContent: error });
      burbuja.id = `error-${campo.id || Math.random().toString(36).slice(2)}`;
      burbuja.setAttribute("role", "alert");
      campo.setAttribute("aria-invalid", "true");
      campo.setAttribute("aria-describedby", burbuja.id);
      (campo.closest(".stepper, .campo-linea") ?? campo).insertAdjacentElement("afterend", burbuja);
      primero ??= campo;
    }
    primero?.focus();
    return !primero;
  }

  #limpiarError(campo) {
    if (campo?.getAttribute?.("aria-invalid") !== "true") return;
    campo.removeAttribute("aria-invalid");
    const id = campo.getAttribute("aria-describedby");
    if (id) document.getElementById(id)?.remove();
    campo.removeAttribute("aria-describedby");
  }

  // Menús desplegables con el estilo del juego. El <select> del navegador sigue escondido debajo
  // y guarda el valor, así el resto del código no cambia.
  #mejorarSelects(raiz) {
    raiz.querySelectorAll("select:not([data-vidrio])").forEach(s => this.#mejorarSelect(s));
  }

  #mejorarSelect(select) {
    select.dataset.vidrio = "1";
    const caja = el("div", { className: "selector" });
    select.before(caja);
    const boton = el("button", { type: "button", className: "selector-boton" });
    boton.setAttribute("aria-haspopup", "listbox");
    boton.setAttribute("aria-expanded", "false");
    const etiqueta = select.id && document.querySelector(`label[for="${select.id}"]`);
    if (etiqueta) { boton.id = `${select.id}-boton`; etiqueta.htmlFor = boton.id; }
    else boton.setAttribute("aria-label", select.getAttribute("aria-label") ?? "");
    const lista = el("ul", { className: "selector-lista", hidden: true });
    lista.setAttribute("role", "listbox");
    caja.append(boton, lista, select);
    select.classList.add("selector-nativo");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    let activa = 0;
    const pintar = () => { boton.textContent = select.selectedOptions[0]?.textContent ?? ""; };
    const marcar = () => lista.querySelectorAll("li").forEach((li, i) => li.classList.toggle("activa", i === activa));
    const fuera = e => { if (!caja.contains(e.target)) cerrar(); };
    const cerrar = () => {
      lista.hidden = true;
      boton.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", fuera, true);
    };
    const elegir = i => {
      select.selectedIndex = i;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      pintar();
      cerrar();
      boton.focus();
    };
    const abrir = () => {
      lista.replaceChildren(...[...select.options].map((o, i) => {
        const li = el("li", { textContent: o.textContent });
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === select.selectedIndex));
        li.addEventListener("click", () => elegir(i));
        return li;
      }));
      activa = Math.max(0, select.selectedIndex);
      marcar();
      lista.hidden = false;
      boton.setAttribute("aria-expanded", "true");
      document.addEventListener("pointerdown", fuera, true);
    };
    boton.addEventListener("click", () => (lista.hidden ? abrir() : cerrar()));
    boton.addEventListener("keydown", e => {
      const n = select.options.length;
      if (lista.hidden) {
        if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); abrir(); }
        return;
      }
      if (e.key === "ArrowDown") { e.preventDefault(); activa = (activa + 1) % n; marcar(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); activa = (activa - 1 + n) % n; marcar(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(activa); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); }
      else if (e.key === "Tab") cerrar();
    });
    select.addEventListener("change", pintar);
    select.refrescar = pintar;   // para cuando el código cambia el valor (por ejemplo, al abrir Opciones)
    pintar();
  }

  // Edad con botones − y + grandes (más fácil en el celular que las flechitas del navegador).
  #stepper(input) {
    const caja = el("div", { className: "stepper" });
    input.before(caja);
    const menos = el("button", { type: "button", textContent: "−", ariaLabel: "Restar un año" });
    const mas = el("button", { type: "button", textContent: "+", ariaLabel: "Sumar un año" });
    const cambiar = paso => {
      const n = Math.min(Number(input.max) || 99, Math.max(Number(input.min) || 0, Math.round(Number(input.value) || 0) + paso));
      input.value = String(n);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    menos.addEventListener("click", () => cambiar(-1));
    mas.addEventListener("click", () => cambiar(1));
    caja.append(menos, input, mas);
  }

  // Descripciones flotantes con el estilo del juego (en vez del cuadrito "title" del navegador).
  #descripciones() {
    const tip = $("#tip");
    let actual = null;
    const mostrar = e => {
      const elem = e.target.closest?.("[title], [data-tip]");
      if (!elem || elem === actual) return;
      if (elem.title) { elem.dataset.tip = elem.title; elem.removeAttribute("title"); }
      if (!elem.dataset.tip) return;
      actual = elem;
      tip.textContent = elem.dataset.tip;
      tip.hidden = false;
      const r = elem.getBoundingClientRect(), t = tip.getBoundingClientRect();
      tip.style.left = `${Math.min(innerWidth - t.width - 12, Math.max(12, r.left + r.width / 2 - t.width / 2))}px`;
      tip.style.top = `${r.bottom + 8 + t.height > innerHeight ? r.top - t.height - 8 : r.bottom + 8}px`;
    };
    const ocultar = e => {
      if (!actual || (e.relatedTarget && actual.contains(e.relatedTarget))) return;
      actual = null;
      tip.hidden = true;
    };
    document.addEventListener("pointerover", mostrar);
    document.addEventListener("pointerout", ocultar);
    document.addEventListener("focusin", mostrar);
    document.addEventListener("focusout", ocultar);
    window.addEventListener("scroll", () => { actual = null; tip.hidden = true; }, true);
  }

  // ======== Eventos de la interfaz ========
  #conectar() {
    const c = () => this.ctx.c;

    $("#form-inicio").addEventListener("submit", e => {
      e.preventDefault();
      if (!this.#validar(e.target)) return;
      const nombre = $("#nombre").value.trim();
      this.sonido("portal");
      c().iniciarSesion.ejecutar(nombre, Number($("#edad").value));
      this.mostrarPersonajes(this.ctx.personajes);
    });

    $("#empezar").addEventListener("click", () => {
      c().guardarProgreso.ejecutar();
      this.irAlGaraje();
      this.decir(`¡Hola, ${this.ctx.jugador.nombre}! Bienvenido a mi garaje. Cada portal lleva a una dimensión. Camina hasta uno.`);
    });

    $("#btn-pausa").addEventListener("click", () => c().pausarPartida.ejecutar());
    $("#btn-mapa").addEventListener("click", () => c().verLogros.mapa());
    $("#btn-reglas").addEventListener("click", () => c().explorarDimension.verReglas());
    $("#btn-saltar").addEventListener("pointerdown", e => { e.preventDefault(); this.mundo.saltar(); });
    $("#btn-logros").addEventListener("click", () => c().verLogros.ejecutar());
    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && this.ctx.jugador && $("#inicio").hidden && $("#personajes").hidden) {
        const abierto = [...document.querySelectorAll(".modal")].find(m => !m.hidden && m.id !== "modal-pausa");
        if (abierto) { abierto.hidden = true; return; }
        c().pausarPartida.ejecutar();
      }
    });

    $("#pausa-continuar").addEventListener("click", () => c().pausarPartida.ejecutar());
    $("#pausa-logros").addEventListener("click", () => c().verLogros.ejecutar());
    $("#pausa-opciones").addEventListener("click", () => this.#mostrarOpciones());
    $("#pausa-reporte").addEventListener("click", () => this.#mostrarReporte());
    $("#pausa-personaje").addEventListener("click", () => {
      c().pausarPartida.ejecutar();
      this.mostrarPersonajes(this.ctx.personajes);
    });
    $("#pausa-garaje").addEventListener("click", () => {
      c().pausarPartida.ejecutar();
      c().jugarNivel.salir();
      c().viajarPorPortal.volverAlGaraje();
    });
    $("#pausa-salir").addEventListener("click", () => c().cerrarSesion.ejecutar());

    $("#form-opciones").addEventListener("submit", e => {
      e.preventDefault();
      if (!this.#validar(e.target)) return;
      c().configurarOpciones.ejecutar(
        { sonido: $("#op-sonido").checked, voz: $("#op-voz").checked, modoDemo: $("#op-demo").checked },
        { nombre: $("#tutor-nombre").value.trim(), correo: $("#tutor-correo").value.trim(), parentesco: $("#tutor-parentesco").value },
      );
      $("#modal-opciones").hidden = true;
      this.anunciar("Opciones guardadas", "Listo.");
    });

    $("#reporte-copiar").addEventListener("click", async () => {
      const texto = `${$("#reporte-para").textContent}\n\n${$("#reporte-texto").textContent}`;
      try {
        await navigator.clipboard.writeText(texto);
        $("#reporte-copiar").textContent = "Copiado";
      } catch {
        const sel = window.getSelection();
        const rango = document.createRange();
        rango.selectNodeContents($("#reporte-texto"));
        sel.removeAllRanges();
        sel.addRange(rango);
        $("#reporte-copiar").textContent = "Texto seleccionado: cópialo";
      }
      setTimeout(() => { $("#reporte-copiar").textContent = "Copiar reporte"; }, 2200);
    });

    $("#reto-pista").addEventListener("click", () => c().pedirPista.ejecutar());
    $("#reto-salir").addEventListener("click", () => {
      c().jugarNivel.salir();
      this.decir("Sin problema. Toca otro cristal cuando quieras.");
    });
    $("#premio-ok").addEventListener("click", () => {
      $("#modal-premio").hidden = true;
      this.mundo.pausado = false;
    });

    document.querySelectorAll("[data-cerrar]").forEach(b => b.addEventListener("click", () => {
      b.closest(".modal").hidden = true;
    }));

    // Admin
    $("#ir-admin").addEventListener("click", () => {
      $("#admin-clave").value = "";
      $("#admin-error").hidden = true;
      this.#pantalla("admin-login");
    });
    $("#form-admin").addEventListener("submit", e => {
      e.preventDefault();
      if (c().iniciarSesion.ejecutarAdmin($("#admin-clave").value)) {
        this.#pintarAdmin();
        this.#pantalla("admin");
      } else {
        $("#admin-error").hidden = false;
      }
    });
    $("#admin-exportar").addEventListener("click", () => {
      c().administrarDimensiones.exportar();
    });
    $("#admin-nueva-dim").addEventListener("click", () => {
      c().administrarDimensiones.ejecutar(this.ctx.dimensiones, "crear", { nombre: "Dimensión nueva", materia: "lectura" });
      this.#pintarAdmin();
    });

    // Importar un mundo exportado desde otro computador.
    $("#admin-importar").addEventListener("click", () => $("#admin-importar-archivo").click());
    $("#admin-importar-archivo").addEventListener("change", async e => {
      const archivo = e.target.files?.[0];
      e.target.value = "";
      if (!archivo) return;
      try {
        if (archivo.size > 2_000_000) throw new Error("El archivo es demasiado grande para ser un mundo.");
        const d = c().administrarDimensiones.importarMundo(await archivo.text());
        this.#pintarAdmin();
        this.anunciar("Mundo importado", d.nombre);
      } catch (err) {
        this.anunciar("No se pudo importar", err.message);
      }
    });

    // Crear un mundo desde material (IA).
    $("#admin-material").addEventListener("click", () => this.#abrirMaterial());
    $("#mat-volver").addEventListener("click", () => { this.#pintarAdmin(); this.#pantalla("admin"); });
    $("#mat-texto").addEventListener("input", () => this.#contarMaterial());
    $("#mat-archivo").addEventListener("change", e => {
      const archivos = [...(e.target.files ?? [])];
      e.target.value = "";
      this.#cargarArchivos(archivos);
    });
    // También se pueden arrastrar archivos sobre el cuadro del material.
    const zona = $("#mat-texto");
    zona.addEventListener("dragover", e => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      zona.classList.add("soltando");
    });
    zona.addEventListener("dragleave", () => zona.classList.remove("soltando"));
    zona.addEventListener("drop", e => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      zona.classList.remove("soltando");
      this.#cargarArchivos([...e.dataTransfer.files]);
    });
    $("#form-material").addEventListener("submit", e => { e.preventDefault(); if (this.#validar(e.target)) this.#pedirPropuestas(); });
    $("#mat-aprobar-todas").addEventListener("click", () => {
      for (const p of this.propuestas ?? []) if (p.estado !== "aprobada") p.marcar("aprobada");
    });
    $("#mat-crear").addEventListener("click", () => this.#crearMundo());
    document.querySelectorAll("[data-volver-inicio]").forEach(b => b.addEventListener("click", () => {
      this.ctx.administrador.cerrarSesion();
      this.irAlInicio();
    }));
  }

  // Palanca táctil para moverse en el celular.
  #joystick() {
    const base = $("#palanca");
    const bola = $("#palanca-bola");
    let activo = null;
    const mover = e => {
      const r = base.getBoundingClientRect();
      let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      this.mundo.joystick = { x, y };
      bola.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
    };
    base.addEventListener("pointerdown", e => { activo = e.pointerId; base.setPointerCapture(e.pointerId); mover(e); });
    base.addEventListener("pointermove", e => { if (e.pointerId === activo) mover(e); });
    const soltar = () => { activo = null; this.mundo.joystick = { x: 0, y: 0 }; bola.style.transform = ""; };
    base.addEventListener("pointerup", soltar);
    base.addEventListener("pointercancel", soltar);
  }

  #confeti(cantidad) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const capa = $("#confeti");
    const colores = ["#7cf03c", "#6dfbd2", "#ffd166", "#ff7a59", "#d59bff"];
    for (let i = 0; i < cantidad; i++) {
      const p = document.createElement("i");
      p.style.left = `${50 + (Math.random() - 0.5) * 60}%`;
      p.style.background = colores[i % colores.length];
      p.style.setProperty("--dx", `${(Math.random() - 0.5) * 420}px`);
      p.style.setProperty("--giro", `${Math.random() * 720}deg`);
      p.style.animationDelay = `${Math.random() * 0.15}s`;
      capa.append(p);
      setTimeout(() => p.remove(), 1600);
    }
  }
}
