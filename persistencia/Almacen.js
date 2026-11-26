// Persistencia en el navegador (localStorage). No es parte del modelo: solo guarda y carga.
//
// PATRÓN DE DISEÑO: SINGLETON (instancia única).
// ¿Para qué? Almacen es UN solo objeto para todo el juego (no es una clase de la que se hagan
// varios "new"). Un módulo de JavaScript se carga una sola vez, así que todos los que
// importan Almacen comparten la misma instancia.
// ¿Por qué? Si hubiera dos almacenes, uno podría guardar el progreso y el otro borrarlo.
import { Dimension, Invento, Jugador, Logro, MisionDiaria, Personaje, Tutor } from "../modelo/index.js";

const CLAVE_JUGADOR = "portal-saber:jugador";
const CLAVE_CONTENIDO = "portal-saber:contenido";
const CLAVE_TUTOR = "portal-saber:tutor";

function leer(clave) {
  try { return JSON.parse(localStorage.getItem(clave) ?? "null"); } catch { return null; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento: el juego sigue */ }
}

const inventoAPlano = i => i && { nombre: i.nombre, descripcion: i.descripcion, efecto: i.efecto };

// Archivo para compartir un mundo entre computadores (exportar / importar).
const FORMATO_MUNDO = "portal-del-saber/mundo";
const MATERIAS = ["lectura", "matematicas", "escritura", "material"];
const EFECTOS = ["leer", "quitar", "energia", "saltar", "velocidad", "estela"];
const texto = (v, max, vacio = false) => typeof v === "string" && v.length <= max && (vacio || v.trim() !== "");

export const Almacen = {
  // Una dimensión como datos simples (para guardarla o para exportarla como archivo).
  dimensionAPlano(d) {
    return {
      nombre: d.nombre, materia: d.materia, desbloqueada: d.desbloqueada,
      niveles: d.niveles.map(n => ({
        numero: n.numero, dificultad: n.dificultad, invento: inventoAPlano(n.invento),
        retos: n.retos.map(r => ({
          pregunta: r.pregunta, opciones: r.opciones, respuestaCorrecta: r.respuestaCorrecta, pista: r.pista,
          ...(r.fuente ? { fuente: r.fuente } : {}),
        })),
      })),
    };
  },

  // Lo contrario: vuelve a armar la Dimension con sus Niveles, Retos e Inventos.
  dimensionDesdePlano(d) {
    return new Dimension(d.nombre, d.materia, d.desbloqueada, d.niveles.map(n => ({
      ...n, invento: n.invento ? new Invento(n.invento.nombre, n.invento.descripcion, n.invento.efecto) : null,
    })));
  },

  guardarContenido(dimensiones) {
    escribir(CLAVE_CONTENIDO, dimensiones.map(d => this.dimensionAPlano(d)));
  },

  // ---- Compartir un mundo como archivo .json ----
  mundoATexto(d) {
    return JSON.stringify({ formato: FORMATO_MUNDO, version: 1, dimension: this.dimensionAPlano(d) }, null, 2);
  },

  descargarArchivo(contenido, nombreArchivo) {
    const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // El archivo puede venir de otro computador: se revisa todo antes de usarlo y solo se copian los datos conocidos.
  leerMundo(contenido) {
    let datos;
    try { datos = JSON.parse(contenido); } catch { datos = null; }
    const d = datos?.formato === FORMATO_MUNDO ? datos.dimension : null;
    const malo = () => new Error("Ese archivo no es un mundo válido del Portal del Saber.");
    if (!d || !texto(d.nombre, 80) || !MATERIAS.includes(d.materia) || !Array.isArray(d.niveles) || d.niveles.length > 12) throw malo();
    const niveles = d.niveles.map(n => {
      if (!Number.isInteger(n?.numero) || !texto(n.dificultad, 20) || !Array.isArray(n.retos) || n.retos.length > 300) throw malo();
      const i = n.invento;
      if (i !== null && i !== undefined && (!texto(i.nombre, 120) || !texto(i.descripcion, 300, true) || !EFECTOS.includes(i.efecto))) throw malo();
      return {
        numero: n.numero, dificultad: n.dificultad,
        invento: i ? { nombre: i.nombre, descripcion: i.descripcion, efecto: i.efecto } : null,
        retos: n.retos.map(r => {
          const ok = texto(r?.pregunta, 500) && Array.isArray(r.opciones) && r.opciones.length === 3
            && r.opciones.every(o => texto(o, 200)) && ["A", "B", "C"].includes(r.respuestaCorrecta)
            && texto(r.pista ?? "", 500, true) && texto(r.fuente ?? "", 2000, true);
          if (!ok) throw malo();
          return { pregunta: r.pregunta, opciones: [...r.opciones], respuestaCorrecta: r.respuestaCorrecta, pista: r.pista ?? "", fuente: r.fuente ?? "" };
        }),
      };
    });
    return this.dimensionDesdePlano({ nombre: d.nombre.trim(), materia: d.materia, desbloqueada: d.desbloqueada !== false, niveles });
  },

  cargarContenido() {
    const datos = leer(CLAVE_CONTENIDO);
    if (!Array.isArray(datos)) return null;
    return datos.map(d => this.dimensionDesdePlano(d));
  },

  guardarJugador(j) {
    escribir(CLAVE_JUGADOR, {
      id: j.id, nombre: j.nombre, edad: j.edad,
      personaje: j.personaje && { nombre: j.personaje.nombre, tipo: j.personaje.tipo, accesorios: j.personaje.accesorios },
      energia: j.portal.energia,
      progreso: { nivelActual: j.progreso.nivelActual, retosCompletados: j.progreso.retosCompletados, ultimaFecha: j.progreso.ultimaFecha },
      logros: j.progreso.logros.map(l => ({ nombre: l.nombre, descripcion: l.descripcion, fecha: l.fecha })),
      misiones: j.progreso.misiones.map(m => ({ descripcion: m.descripcion, fecha: m.fecha, completada: m.completada })),
      inventos: j.inventos.map(i => i.nombre),
      opciones: j.opciones,
    });
  },

  // Reconstruye el jugador. Los inventos se buscan en el contenido para que sean los mismos objetos (agregación).
  cargarJugador(dimensiones) {
    const d = leer(CLAVE_JUGADOR);
    if (!d) return null;
    const j = new Jugador(d.id, d.nombre, d.edad);
    if (d.personaje) j.elegirPersonaje(new Personaje(d.personaje.nombre, d.personaje.tipo, d.personaje.accesorios));
    j.portal.energia = d.energia ?? 0;
    Object.assign(j.progreso, { nivelActual: d.progreso.nivelActual, retosCompletados: d.progreso.retosCompletados,
      ultimaFecha: d.progreso.ultimaFecha ? new Date(d.progreso.ultimaFecha) : null });
    j.progreso.logros = (d.logros ?? []).map(l => new Logro(l.nombre, l.descripcion, l.fecha ? new Date(l.fecha) : null));
    j.progreso.misiones = (d.misiones ?? []).map(m => new MisionDiaria(m.descripcion, m.fecha, m.completada));
    const todos = dimensiones.flatMap(x => x.niveles.map(n => n.invento)).filter(Boolean);
    j.inventos = (d.inventos ?? []).map(n => todos.find(i => i.nombre === n)).filter(Boolean);
    Object.assign(j.opciones, d.opciones ?? {});
    return j;
  },

  borrarJugador() {
    try { localStorage.removeItem(CLAVE_JUGADOR); } catch { /* nada */ }
  },

  guardarTutor(t) {
    escribir(CLAVE_TUTOR, { nombre: t.nombre, correo: t.correo, parentesco: t.parentesco, ultimoReporte: t.ultimoReporte });
  },

  cargarTutor() {
    const d = leer(CLAVE_TUTOR);
    const t = new Tutor(d?.nombre ?? "", d?.correo ?? "", d?.parentesco ?? "");
    t.ultimoReporte = d?.ultimoReporte ?? "";
    return t;
  },
};
