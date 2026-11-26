// Convierte el archivo que sube el profe en TEXTO para el material.
// ¿Por qué texto? Porque el juego comprueba cada pregunta contra el texto exacto del material:
// si la IA leyera el archivo directamente, no habría con qué comparar sus citas.
//   - Texto, Word, PowerPoint, Excel, OpenDocument, RTF, HTML y PDF con texto: se leen aquí, sin IA.
//   - Fotos y PDF escaneados (solo imagen): la IA transcribe el texto y el profe lo revisa.
// Resultado: { texto, detalle } o, si hace falta la IA, { necesitaIA: true, mediaType, base64, detalle }.

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build";
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_IA_BYTES = 10 * 1024 * 1024;

export const TIPOS_ACEPTADOS = ".txt,.md,.csv,.tsv,.json,.html,.htm,.rtf,.pdf,.docx,.pptx,.xlsx,.odt,.odp,.ods,.jpg,.jpeg,.png,.webp,.gif";

const POR_MIME = {
  "text/plain": "txt", "text/markdown": "md", "text/csv": "csv", "text/html": "html", "application/json": "json",
  "application/rtf": "rtf", "text/rtf": "rtf", "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.oasis.opendocument.text": "odt", "application/vnd.oasis.opendocument.presentation": "odp",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

// Ordena el texto: sin espacios repetidos, sin palabras cortadas con guion al final de la línea.
export const limpiarTexto = t => String(t ?? "").replace(/\r\n?/g, "\n").replace(/[ \t ]+/g, " ")
  .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();

const miles = n => n.toLocaleString("es-CO");

export async function leerArchivo(archivo) {
  if (archivo.size > MAX_BYTES) throw new Error(`«${archivo.name}» pesa más de 25 MB. Sube solo la parte de la lección que quieres usar.`);
  const ext = (archivo.name.match(/\.([^.]+)$/)?.[1] ?? POR_MIME[archivo.type] ?? "").toLowerCase();
  const listo = (texto, detalle) => {
    const t = limpiarTexto(texto);
    if (!t) throw new Error(`No encontré texto en «${archivo.name}».`);
    return { texto: t, detalle: `${detalle}, ${miles(t.length)} caracteres` };
  };

  if (["txt", "md", "csv", "tsv", "json"].includes(ext)) return listo(await textoPlano(archivo), `Leí «${archivo.name}»`);
  if (["html", "htm"].includes(ext)) return listo(htmlATexto(await textoPlano(archivo)), `Leí la página «${archivo.name}»`);
  if (ext === "rtf") return listo(rtfATexto(await textoPlano(archivo)), `Leí «${archivo.name}»`);
  if (ext === "docx") return listo(await docxATexto(await abrirZip(archivo)), `Leí el Word «${archivo.name}»`);
  if (ext === "pptx") {
    const { texto, diapositivas } = await pptxATexto(await abrirZip(archivo));
    return listo(texto, `Leí la presentación «${archivo.name}» (${diapositivas} diapositivas)`);
  }
  if (ext === "xlsx") return listo(await xlsxATexto(await abrirZip(archivo)), `Leí la hoja de cálculo «${archivo.name}»`);
  if (["odt", "odp", "ods"].includes(ext)) return listo(await odfATexto(await abrirZip(archivo)), `Leí «${archivo.name}»`);
  if (ext === "pdf") {
    const { texto, paginas } = await pdfATexto(archivo);
    // Si casi no tiene texto, es un PDF escaneado (fotos de páginas): lo tiene que leer la IA.
    if (limpiarTexto(texto).length >= 40 * paginas) return listo(texto, `Leí el PDF «${archivo.name}» (${paginas} páginas)`);
    if (archivo.size > MAX_IA_BYTES) throw new Error(`«${archivo.name}» es un PDF escaneado de más de 10 MB. Sube solo las páginas de la lección.`);
    return { necesitaIA: true, mediaType: "application/pdf", base64: await aBase64(archivo), detalle: `«${archivo.name}» es un PDF escaneado (${paginas} páginas)` };
  }
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return { necesitaIA: true, mediaType: "image/jpeg", base64: await imagenParaIA(archivo), detalle: `«${archivo.name}» es una foto` };
  }
  if (["doc", "ppt", "xls"].includes(ext)) throw new Error(`«${archivo.name}» es un formato antiguo de Office. Ábrelo y guárdalo como .docx, .pptx, .xlsx o PDF.`);
  if (/^(audio|video)\//.test(archivo.type) || ["mp3", "wav", "m4a", "ogg", "mp4", "mov", "avi", "webm"].includes(ext)) {
    throw new Error(`«${archivo.name}» es audio o video: la IA necesita texto. Sube la transcripción o un documento de la clase.`);
  }
  throw new Error(`No sé leer «${archivo.name}». Sirven PDF, Word, PowerPoint, Excel, OpenDocument, texto, páginas web y fotos.`);
}

// ---------- Texto plano (UTF-8, UTF-16 o el formato viejo de Windows) ----------
async function textoPlano(archivo) {
  const b = new Uint8Array(await archivo.arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  const t = new TextDecoder("utf-8").decode(b).replace(/^﻿/, "");
  return t.includes("�") ? new TextDecoder("windows-1252").decode(b) : t;
}

function htmlATexto(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, template").forEach(e => e.remove());
  doc.querySelectorAll("br").forEach(e => e.replaceWith("\n"));
  doc.querySelectorAll("p, div, li, tr, h1, h2, h3, h4, h5, h6, section, article, blockquote").forEach(e => e.append("\n"));
  return doc.body?.textContent ?? "";
}

// ---------- RTF: se recorre el texto y se saltan los comandos y las tablas de formato ----------
function rtfATexto(rtf) {
  const SALTAR = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer", "headerl", "headerr",
    "footerl", "footerr", "object", "listtable", "listoverridetable", "rsidtbl", "generator", "themedata",
    "colorschememapping", "latentstyles", "datastore", "xmlnstbl", "expandedcolortbl"]);
  const cp1252 = new TextDecoder("windows-1252");
  let salida = "", i = 0, saltar = false, porSaltar = 0, uc = 1;
  const pila = [];
  while (i < rtf.length) {
    const c = rtf[i];
    if (c === "{") { pila.push(saltar); i++; continue; }
    if (c === "}") { saltar = pila.pop() ?? false; i++; continue; }
    if (c === "\\") {
      const s = rtf[i + 1];
      if (s === "\\" || s === "{" || s === "}") { if (!saltar) salida += s; i += 2; continue; }
      if (s === "'") {
        if (!saltar) { if (porSaltar > 0) porSaltar--; else salida += cp1252.decode(new Uint8Array([parseInt(rtf.substr(i + 2, 2), 16)])); }
        i += 4; continue;
      }
      if (s === "*") { saltar = true; i += 2; continue; }
      if (s === "~") { if (!saltar) salida += " "; i += 2; continue; }
      if (s === "\n" || s === "\r") { if (!saltar) salida += "\n"; i += 2; continue; }
      const m = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i + 1, i + 42));
      if (!m) { i += 2; continue; }
      i += 1 + m[0].length;
      const [, palabra, numero] = m;
      if (SALTAR.has(palabra)) { saltar = true; continue; }
      if (saltar) continue;
      if (["par", "line", "sect", "page", "row"].includes(palabra)) salida += "\n";
      else if (palabra === "tab" || palabra === "cell") salida += " ";
      else if (palabra === "uc") uc = Number(numero ?? 1);
      else if (palabra === "u") { let n = Number(numero); if (n < 0) n += 65536; salida += String.fromCharCode(n); porSaltar = uc; }
      continue;
    }
    if (c !== "\r" && c !== "\n" && !saltar) { if (porSaltar > 0) porSaltar--; else salida += c; }
    i++;
  }
  return salida;
}

// ---------- Archivos .docx, .pptx, .xlsx, .odt…: por dentro son un ZIP con XML ----------
async function abrirZip(archivo) {
  const buf = new Uint8Array(await archivo.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dec = new TextDecoder();
  let fin = -1;   // "fin del directorio central": dice dónde está la lista de archivos del ZIP
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error("El archivo está dañado o no es un documento de Office/OpenDocument.");
  const entradas = new Map();
  let p = dv.getUint32(fin + 16, true);
  for (let k = dv.getUint16(fin + 10, true); k > 0 && dv.getUint32(p, true) === 0x02014b50; k--) {
    const largoNombre = dv.getUint16(p + 28, true);
    entradas.set(dec.decode(buf.subarray(p + 46, p + 46 + largoNombre)), {
      metodo: dv.getUint16(p + 10, true), tam: dv.getUint32(p + 20, true), local: dv.getUint32(p + 42, true),
    });
    p += 46 + largoNombre + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  return {
    nombres: [...entradas.keys()],
    async leer(nombre) {
      const e = entradas.get(nombre);
      if (!e) return null;
      const ini = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
      const datos = buf.subarray(ini, ini + e.tam);
      if (e.metodo === 0) return dec.decode(datos);
      if (e.metodo !== 8) throw new Error("El archivo usa una compresión que no conozco.");
      return new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
    },
  };
}

const entidades = t => t.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => e[0] === "#"
  ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[e.toLowerCase()]);

// Junta el texto de cada párrafo: "patron" encuentra los trozos de texto, saltos y tabulaciones.
function parrafos(xml, cierre, patron) {
  return xml.split(cierre).map(par => [...par.matchAll(patron)]
    .map(m => (m[1] !== undefined ? entidades(m[1]) : /tab/.test(m[0]) ? " " : "\n")).join(""))
    .filter(l => l.trim()).join("\n");
}

async function docxATexto(zip) {
  const xml = await zip.leer("word/document.xml");
  if (!xml) throw new Error("No encontré el texto dentro del Word.");
  return parrafos(xml, "</w:p>", /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\b[^>]*\/>/g);
}

async function pptxATexto(zip) {
  const diapos = zip.nombres.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const textos = [];
  for (const n of diapos) textos.push(parrafos(await zip.leer(n), "</a:p>", /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>|<a:br\b[^>]*\/>/g));
  return { texto: textos.filter(Boolean).join("\n\n"), diapositivas: diapos.length };
}

async function xlsxATexto(zip) {
  const compartidos = [...((await zip.leer("xl/sharedStrings.xml")) ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => [...m[1].matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map(t => entidades(t[1])).join(""));
  const hojas = zip.nombres.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  const filas = [];
  for (const h of hojas) {
    for (const fila of (await zip.leer(h)).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const celdas = [...fila[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map(([, attrs, dentro = ""]) => {
        const tipo = attrs.match(/\bt="(\w+)"/)?.[1];
        if (tipo === "inlineStr") return [...dentro.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map(t => entidades(t[1])).join("");
        const v = dentro.match(/<v>([^<]*)<\/v>/)?.[1];
        if (v === undefined) return "";
        return tipo === "s" ? compartidos[Number(v)] ?? "" : entidades(v);
      }).filter(Boolean);
      if (celdas.length) filas.push(celdas.join(" | "));
    }
  }
  return filas.join("\n");
}

async function odfATexto(zip) {
  const xml = await zip.leer("content.xml");
  if (!xml) throw new Error("No encontré el texto dentro del documento.");
  return [...xml.matchAll(/<text:(p|h)\b[^>]*?(?:\/>|>([\s\S]*?)<\/text:\1>)/g)].map(([, , dentro = ""]) => entidades(dentro
    .replace(/<text:s(?:\s+text:c="(\d+)")?\s*\/>/g, (_, n) => " ".repeat(Number(n ?? 1)))
    .replace(/<text:tab\s*\/>/g, " ").replace(/<text:line-break\s*\/>/g, "\n").replace(/<[^>]+>/g, "")))
    .filter(l => l.trim()).join("\n");
}

// ---------- PDF: se usa pdf.js (de Mozilla) desde el mismo CDN que Three.js ----------
async function pdfATexto(archivo) {
  const pdfjs = await import(`${PDFJS}/pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()), isEvalSupported: false }).promise;
  } catch (e) {
    throw new Error(e?.name === "PasswordException" ? `«${archivo.name}» tiene contraseña. Quítasela y súbelo otra vez.` : `No pude abrir el PDF «${archivo.name}».`);
  }
  const paginas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const contenido = await (await doc.getPage(n)).getTextContent();
    paginas.push(contenido.items.map(it => (it.str ?? "") + (it.hasEOL ? "\n" : "")).join(""));
  }
  const total = doc.numPages;
  await doc.destroy();
  return { texto: paginas.join("\n\n"), paginas: total };
}

// ---------- Para la IA: archivo en base64; las fotos se achican para que pesen poco ----------
async function aBase64(blob) {
  const b = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

async function imagenParaIA(archivo) {
  let bitmap;
  try { bitmap = await createImageBitmap(archivo); } catch { throw new Error(`No pude abrir la imagen «${archivo.name}».`); }
  const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  const ctx = lienzo.getContext("2d");
  ctx.fillStyle = "#fff";   // las imágenes con transparencia quedan sobre fondo blanco
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  const jpg = await new Promise(r => lienzo.toBlob(r, "image/jpeg", 0.88));
  return aBase64(jpg);
}
