// Reglas para revisar las preguntas que la IA propone a partir del material del profe.
// La IA no se cree: cada pregunta se compara con el texto del profe y lo que no sale de ahí se descarta.
// Lo que pasa esta revisión llega al profe como borrador; el niño solo ve lo que el profe aprueba.
//
// Las tres pruebas de cada pregunta:
//   1. La frase que cita la IA está, palabra por palabra, en el material.
//   2. La respuesta correcta sale de esa frase (sus palabras importantes están en ella).
//   3. La pista no dice la respuesta.

// Palabras que no cuentan para decidir si una respuesta "sale" de la frase.
const VACIAS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "y", "o", "e", "u", "en", "con",
  "por", "para", "que", "se", "su", "sus", "es", "son", "fue", "era", "lo", "le", "les", "mas", "muy", "sin",
  "sobre", "entre", "como", "cuando", "porque", "pero", "ya", "no", "si", "tambien", "este", "esta", "estos",
  "estas", "ese", "esa", "eso", "esto", "hay",
]);

// Minúsculas, sin tildes y sin signos: así "El sol, ¡calienta!" y "el sol calienta" se comparan igual.
export const normalizar = t => String(t ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const palabras = t => normalizar(t).split(" ").filter(Boolean);
const importantes = t => palabras(t).filter(w => /\d/.test(w) || (w.length >= 3 && !VACIAS.has(w)));

// "nube" y "nubes", o "evapora" y "evaporación", cuentan como la misma palabra. Los números, exactos.
function parecidas(a, b) {
  if (a === b) return true;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i >= 4 && i >= Math.min(a.length, b.length) - 2;
}

// ¿El texto sale de la frase? Todas sus palabras importantes tienen que estar en ella.
function saleDe(texto, frase) {
  const claves = importantes(texto);
  if (!claves.length) return ` ${normalizar(frase)} `.includes(` ${normalizar(texto)} `) && normalizar(texto) !== "";
  const enFrase = palabras(frase);
  return claves.every(w => enFrase.some(c => parecidas(w, c)));
}

// ¿La pista dice la respuesta?
function revela(pista, respuesta) {
  const claves = importantes(respuesta);
  if (!claves.length) return ` ${normalizar(pista)} `.includes(` ${normalizar(respuesta)} `);
  const enPista = palabras(pista);
  return claves.every(w => enPista.includes(w));
}

const PISTA_SEGURA = "Vuelve a leer la parte del material que habla de esto.";

// Revisa lo que mandó la IA. Devuelve las que pasan (con avisos para el profe) y las descartadas (con el motivo).
export function verificarPropuestas(datos, material) {
  const textoMaterial = ` ${normalizar(material)} `;
  const aceptadas = [];
  const descartadas = [];
  const vistas = new Set();
  for (const d of Array.isArray(datos) ? datos : []) {
    const pregunta = String(d?.pregunta ?? "").trim();
    const opciones = Array.isArray(d?.opciones) ? d.opciones.map(o => String(o ?? "").trim()) : [];
    const i = Number(d?.correcta);
    const cita = String(d?.cita ?? "").trim();
    const descartar = motivo => descartadas.push({ pregunta: pregunta || "(sin pregunta)", motivo });

    if (!pregunta || opciones.length !== 3 || opciones.some(o => !o) || !Number.isInteger(i) || i < 0 || i > 2) {
      descartar("Le faltan datos: la pregunta, las 3 opciones o cuál es la correcta.");
      continue;
    }
    if (new Set(opciones.map(normalizar)).size !== 3) { descartar("Tiene opciones repetidas."); continue; }
    if (vistas.has(normalizar(pregunta))) { descartar("Está repetida."); continue; }
    const largoCita = palabras(cita).length;
    if (largoCita < 4) { descartar("No trae la frase del material de donde sale."); continue; }
    if (largoCita > 60) { descartar("La frase citada es demasiado larga para comprobarla."); continue; }
    if (!textoMaterial.includes(` ${normalizar(cita)} `)) { descartar("La frase que citó la IA no está en tu material."); continue; }
    const correcta = opciones[i];
    if (!saleDe(correcta, cita)) { descartar("La respuesta correcta no sale de la frase del material."); continue; }

    const avisos = [];
    let pista = String(d?.pista ?? "").trim();
    if (!pista) {
      pista = PISTA_SEGURA;
      avisos.push("La IA no trajo pista: puse una general.");
    } else if (revela(pista, correcta)) {
      pista = PISTA_SEGURA;
      avisos.push("Cambié la pista porque decía la respuesta.");
    }
    if (opciones.some((o, k) => k !== i && saleDe(o, cita))) avisos.push("Otra opción también sale de la frase: revisa que solo una sea correcta.");
    if (palabras(pregunta).length > 30) avisos.push("La pregunta es larga para un niño.");
    vistas.add(normalizar(pregunta));
    const nivel = [1, 2, 3].includes(Number(d?.nivel)) ? Number(d.nivel) : 1 + (aceptadas.length % 3);
    aceptadas.push({ nivel, pregunta, opciones, correcta: i, pista, cita, avisos });
  }
  return { aceptadas, descartadas };
}

// Revisa una pregunta que el profe aprobó (pudo editarla). Devuelve el problema, o null si está bien.
export function problemaEnAprobada(p) {
  const opciones = (p.opciones ?? []).map(o => String(o ?? "").trim());
  if (!String(p.pregunta ?? "").trim()) return "Falta el texto de la pregunta.";
  if (opciones.length !== 3 || opciones.some(o => !o)) return "Cada pregunta necesita 3 opciones.";
  if (new Set(opciones.map(normalizar)).size !== 3) return "Hay opciones repetidas.";
  if (![0, 1, 2].includes(Number(p.correcta))) return "Falta marcar la opción correcta.";
  return null;
}
