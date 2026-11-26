import { inventosDeMundo } from "../datos/contenido.js";
import { edadValida, MATERIAL_MAX, MATERIAL_MIN } from "../servicios/instrucciones.js";
import { leerArchivo as extraerTexto, limpiarTexto } from "../servicios/leerArchivo.js";
import { problemaEnAprobada, verificarPropuestas } from "./verificarMaterial.js";

const LETRAS = ["A", "B", "C"];

// Caso de uso: Crear dimensión desde material «extend» Administrar dimensiones — actor Admin.
// 1. El profe pega el material de su clase o sube un archivo (PDF, Word, PowerPoint, foto…), que se pasa a texto.
// 2. La IA propone preguntas y el juego revisa que cada una salga del material (verificarMaterial.js).
// 3. El profe aprueba, corrige o descarta cada pregunta.
// 4. Con las aprobadas nace una dimensión nueva (materia "material").
// En esa dimensión la IA nunca le habla al niño ni inventa en vivo: solo salen preguntas aprobadas.
export class CrearDimensionDesdeMaterialControlador {
  static MIN_CARACTERES = MATERIAL_MIN;   // los mismos límites que revisa el servidor
  static MAX_CARACTERES = MATERIAL_MAX;
  static PREGUNTAS = 15;

  constructor(ctx) { this.ctx = ctx; }

  // Paso 1 con archivo: lo pasa a texto para que el profe lo vea y lo corrija.
  // Documentos y PDF con texto se leen sin IA; fotos y PDF escaneados los transcribe la IA.
  // Devuelve { texto, mensaje, porIA }. Si algo falla, lanza un Error con un mensaje para el profe.
  async leerArchivo(archivo) {
    const { administrador, ia } = this.ctx;
    if (!administrador.sesionActiva) throw new Error("Inicia sesión como administrador.");
    const leido = await extraerTexto(archivo);
    if (!leido.necesitaIA) return { texto: leido.texto, mensaje: `${leido.detalle}.`, porIA: false };

    // Si la página recién abrió, primero se espera a saber si hay IA (no se da por perdida antes de tiempo).
    const hayIA = await ia?.disponibleTras?.();
    if (ia?.estado === "sample") throw new Error(`${leido.detalle}: las fotos y los PDF escaneados se leen con el juego publicado en internet (o con servidor.mjs y tu llave). También puedes subir el texto en PDF, Word o .txt.`);
    if (!hayIA) throw new Error(`${leido.detalle}: para leerlo hace falta la IA, y esta copia del juego no la tiene conectada (falta la llave de Claude en el servidor). Usa el link publicado o sube el texto en PDF, Word o .txt.`);
    let texto;
    try {
      texto = limpiarTexto(await ia.transcribir(leido.mediaType, leido.base64));
    } catch (e) {
      if (e?.status === 429) throw new Error("Se alcanzó el límite de archivos leídos con IA por ahora. Prueba más tarde.");
      if (e?.status === 413) throw new Error(`«${archivo.name}» es muy grande para la IA. Sube solo las páginas de la lección.`);
      throw new Error(`La IA no pudo leer «${archivo.name}». Prueba otra vez o sube el texto en PDF, Word o .txt.`);
    }
    if (!texto || texto === "[sin texto]") throw new Error(`La IA no encontró texto en «${archivo.name}».`);
    return {
      texto,
      porIA: true,
      mensaje: `${leido.detalle}: la IA transcribió ${texto.length.toLocaleString("es-CO")} caracteres. Revisa que el texto diga lo mismo que el original: las preguntas se comprobarán contra este texto.`,
    };
  }

  // Pasos 1 y 2. Devuelve { aceptadas, descartadas }. Si algo falla, lanza un Error con un mensaje para el profe.
  async proponer(material, edad = 7) {
    const { administrador, ia } = this.ctx;
    const C = CrearDimensionDesdeMaterialControlador;
    if (!administrador.sesionActiva) throw new Error("Inicia sesión como administrador.");
    const texto = String(material ?? "").trim();
    if (texto.length < C.MIN_CARACTERES) throw new Error(`El material es muy corto: escribe al menos ${C.MIN_CARACTERES} caracteres.`);
    if (texto.length > C.MAX_CARACTERES) throw new Error(`El material es muy largo (máximo ${C.MAX_CARACTERES} caracteres). Divídelo en dos mundos.`);
    if (!(await ia?.disponibleTras?.())) throw new Error("Esta copia del juego no tiene la IA conectada (falta la llave de Claude en el servidor). Usa el link publicado, o en tu computador pon la llave en el archivo .env.");
    let datos;
    try {
      datos = await ia.preguntasDesdeMaterial(texto, edadValida(edad), C.PREGUNTAS);
    } catch (e) {
      if (e?.status === 429) throw new Error("Se alcanzó el límite de pedidos a la IA por ahora. Prueba otra vez más tarde.");
      throw new Error("La IA no respondió. Prueba otra vez en un momento.");
    }
    return verificarPropuestas(datos, texto);
  }

  // Paso 4: crea la dimensión SOLO con las preguntas que el profe aprobó.
  // aprobadas: [{ nivel, pregunta, opciones, correcta, pista, cita }]
  ejecutar(tema, aprobadas = []) {
    const { administrador, almacen, dimensiones, vista } = this.ctx;
    if (!administrador.sesionActiva) throw new Error("Inicia sesión como administrador.");
    let nombreTema = String(tema ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (!nombreTema) throw new Error("Ponle un nombre al mundo.");
    if (aprobadas.length < 3) throw new Error("Aprueba al menos 3 preguntas: una para cada nivel.");
    aprobadas.forEach((p, k) => {
      const problema = problemaEnAprobada(p);
      if (problema) throw new Error(`Pregunta ${k + 1}: ${problema}`);
    });
    // El nombre no se puede repetir: los inventos del mundo llevan el tema en su nombre.
    const base = nombreTema;
    for (let n = 2; dimensiones.some(d => d.nombre === `Dimensión: ${nombreTema}`); n++) nombreTema = `${base} ${n}`;

    // Se usa el CRUD del Administrador (dependencia «administra»): dimensión, niveles y retos.
    administrador.administrarDimension(dimensiones, "crear", { nombre: `Dimensión: ${nombreTema}`, materia: "material", desbloqueada: true });
    const dimension = dimensiones.at(-1);
    const [lupa, rayo, bateria, corona] = inventosDeMundo(nombreTema);
    const grupos = repartir(aprobadas);
    [["fácil", lupa], ["medio", rayo], ["difícil", bateria]].forEach(([dificultad, invento], i) => {
      const nivel = administrador.administrarNivel(dimension, "crear", { dificultad, invento }).at(-1);
      for (const p of grupos[i]) {
        administrador.administrarReto(nivel, "crear", {
          pregunta: p.pregunta.trim(),
          opciones: p.opciones.map(o => o.trim()),
          respuestaCorrecta: LETRAS[Number(p.correcta)],
          pista: String(p.pista ?? "").trim() || "Vuelve a leer la parte del material que habla de esto.",
          fuente: String(p.cita ?? "").trim(),
        });
      }
    });
    administrador.administrarNivel(dimension, "crear", { dificultad: "jefe", invento: corona });   // el guardián
    almacen.guardarContenido(dimensiones);
    vista.refrescarPortales();
    return dimension;
  }
}

// Reparte las preguntas en los niveles 1, 2 y 3 según el nivel que tienen.
// Si algún nivel queda vacío, las reparte en partes casi iguales (de la más fácil a la más difícil).
function repartir(preguntas) {
  const grupos = [1, 2, 3].map(n => preguntas.filter(p => Number(p.nivel) === n));
  if (grupos.every(g => g.length)) return grupos;
  const orden = [...preguntas].sort((a, b) => Number(a.nivel) - Number(b.nivel));
  const base = Math.floor(orden.length / 3), resto = orden.length % 3;
  const t1 = base + (resto > 0 ? 1 : 0), t2 = base + (resto > 1 ? 1 : 0);
  return [orden.slice(0, t1), orden.slice(t1, t1 + t2), orden.slice(t1 + t2)];
}
