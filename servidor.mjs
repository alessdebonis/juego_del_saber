// Servidor local opcional: sirve el juego y conecta a Rick con la API de Claude.
// Uso:  ANTHROPIC_API_KEY=tu_llave node servidor.mjs   →  abre http://localhost:8000
// La llave queda en el servidor: nunca llega al navegador del niño.
//
// En internet (Render): la llave va en el panel de Render > Environment, nunca en el código.
//
// Protección de créditos:
//   1. El navegador solo manda DATOS (materia, dificultad, edad… o el material del profe).
//      El servidor arma él mismo las instrucciones para la IA: nadie puede usar la llave para otra cosa.
//   2. Hay un límite de pedidos por persona (IP) por hora y otro en total por día.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { ARCHIVOS_TRANSCRIBIR, instrucciones, instruccionesMaterial, instruccionesTranscribir, MATERIAL_MAX, MATERIAL_MIN, MATERIAS_IA } from "./servicios/instrucciones.js";

const PUERTO = Number(process.env.PORT ?? 8000);
const LLAVE = process.env.ANTHROPIC_API_KEY;
const MODELO = process.env.RICK_MODELO ?? "claude-haiku-5-5";
// Claude Haiku 5.5 siempre piensa antes de responder. Para estas tareas (retos cortos, preguntas, transcribir)
// basta pensar poco: así responde más rápido, gasta menos y le queda espacio para la respuesta.
// Para un modelo sin "effort" (por ejemplo Haiku 4.5), pon RICK_ESFUERZO vacío en el entorno.
const ESFUERZO = process.env.RICK_ESFUERZO ?? "low";
const RAIZ = new URL(".", import.meta.url).pathname;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

const POR_HORA = Number(process.env.LIMITE_POR_HORA ?? 40);                    // retos con IA por persona por hora
const MATERIAL_POR_HORA = Number(process.env.LIMITE_MATERIAL_POR_HORA ?? 10);  // mundos desde material por persona por hora
const TRANSCRIBIR_POR_HORA = Number(process.env.LIMITE_TRANSCRIBIR_POR_HORA ?? 10); // fotos o PDF escaneados por persona por hora
const POR_DIA = Number(process.env.LIMITE_POR_DIA ?? 600);                     // pedidos en total por día

const pedidosIP = new Map();   // "ruta|ip" → momentos de sus pedidos en la última hora
let diaActual = new Date().toDateString(), pedidosHoy = 0;

function puedePedir(ruta, ip, porHora) {
  const ahora = Date.now();
  if (new Date().toDateString() !== diaActual) { diaActual = new Date().toDateString(); pedidosHoy = 0; }
  const clave = `${ruta}|${ip}`;
  const lista = (pedidosIP.get(clave) ?? []).filter(t => ahora - t < 3600_000);
  if (lista.length >= porHora || pedidosHoy >= POR_DIA) {
    pedidosIP.set(clave, lista);
    return false;
  }
  lista.push(ahora);
  pedidosIP.set(clave, lista);
  pedidosHoy++;
  return true;
}

const entero = (v, min, max, base) => Math.min(max, Math.max(min, Math.round(Number(v) || base)));
const textoCorto = lista => (Array.isArray(lista) ? lista : []).slice(0, 12).map(t => String(t).slice(0, 80));

// Cada ruta: cuánto puede pesar el pedido, cuántos se permiten por hora, cuánto puede escribir la IA
// y cómo se arma el mensaje para la IA con los datos recibidos (null = datos no válidos).
// "texto": la IA responde texto (una transcripción) en vez de una lista de retos.
const RUTAS = {
  "/api/rick": {
    cuerpo: 20000, porHora: POR_HORA, tokens: 8000,
    armar(d) {
      if (!Object.hasOwn(MATERIAS_IA, d.materia)) return null;
      return instrucciones(d.materia, entero(d.dificultad, 1, 5, 1), entero(d.edad, 4, 12, 7),
        { vistos: textoCorto(d.vistos), fallados: textoCorto(d.fallados).slice(0, 3) });
    },
  },
  "/api/rick/material": {
    cuerpo: 80000, porHora: MATERIAL_POR_HORA, tokens: 16000,
    armar(d) {
      const material = typeof d.material === "string" ? d.material.trim() : "";
      if (material.length < MATERIAL_MIN || material.length > MATERIAL_MAX) return null;
      return instruccionesMaterial(material, entero(d.edad, 4, 12, 7), entero(d.cantidad, 1, 20, 15));
    },
  },
  // Foto o PDF escaneado del profe → texto. Solo se aceptan esos tipos de archivo, en base64.
  "/api/rick/transcribir": {
    cuerpo: 15_000_000, porHora: TRANSCRIBIR_POR_HORA, tokens: 16000, texto: true,
    armar(d) {
      const bloque = ARCHIVOS_TRANSCRIBIR[d.mediaType];
      if (!bloque || typeof d.datos !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(d.datos)) return null;
      return [
        { type: bloque, source: { type: "base64", media_type: d.mediaType, data: d.datos } },
        { type: "text", text: instruccionesTranscribir() },
      ];
    },
  },
};

// contenido: el texto de las instrucciones, o una lista de bloques (archivo + instrucciones).
async function preguntarAClaude(contenido, maxTokens, comoTexto = false) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": LLAVE, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: maxTokens,   // incluye lo que la IA piensa: si fuera muy poco, no le quedaría espacio para responder
      ...(ESFUERZO ? { output_config: { effort: ESFUERZO } } : {}),
      messages: [{ role: "user", content: contenido }],
    }),
    signal: AbortSignal.timeout(120_000),   // si la IA tarda más de 2 minutos, se corta y el juego sigue sin ella
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
  const datos = await r.json();
  const texto = datos.content?.filter(b => b.type === "text").map(b => b.text).join("") ?? "";
  // Si no llegó texto (se acabó el espacio pensando, o la IA se negó), se dice por qué en el registro.
  const motivo = `stop_reason: ${datos.stop_reason}, bloques: ${(datos.content ?? []).map(b => b.type).join(",") || "ninguno"}`;
  if (!texto.trim()) throw new Error(`La IA no devolvió texto (${motivo})`);
  if (comoTexto) return { texto };
  const inicio = texto.indexOf("["), fin = texto.lastIndexOf("]");
  if (inicio < 0 || fin < inicio) throw new Error(`La IA no devolvió una lista (${motivo})`);
  return JSON.parse(texto.slice(inicio, fin + 1));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/rick/estado") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: Boolean(LLAVE), modelo: MODELO }));
    }
    const ruta = RUTAS[url.pathname];
    if (ruta && req.method === "POST") {
      if (!LLAVE) { res.writeHead(503); return res.end("Falta ANTHROPIC_API_KEY"); }
      // Se juntan los pedazos como bytes y se leen al final, para no partir letras con tilde.
      const partes = [];
      let largo = 0;
      for await (const parte of req) {
        largo += parte.length;
        if (largo > ruta.cuerpo) { res.writeHead(413); return res.end("Pedido demasiado grande"); }
        partes.push(parte);
      }
      let datos = null;
      try { datos = JSON.parse(Buffer.concat(partes).toString("utf8")); } catch { /* se responde 400 abajo */ }
      // Solo se usan los datos conocidos: si el pedido trae otras cosas (por ejemplo, instrucciones), se ignoran.
      const prompt = datos && typeof datos === "object" ? ruta.armar(datos) : null;
      if (!prompt) { res.writeHead(400); return res.end("Datos no válidos"); }
      // Detrás de un servicio como Render, la IP real del visitante llega en x-forwarded-for.
      const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress).split(",")[0].trim();
      if (!puedePedir(url.pathname, ip, ruta.porHora)) {
        res.writeHead(429);
        return res.end("Límite de pedidos a la IA alcanzado; el juego sigue con retos locales.");
      }
      const retos = await preguntarAClaude(prompt, ruta.tokens, ruta.texto);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(retos));
    }
    // Archivos del juego. En internet no se muestran archivos ocultos (los que empiezan con punto, como .git o .env).
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    if (url.pathname.split("/").some(parte => parte.startsWith("."))) { res.writeHead(404); return res.end(); }
    const archivoPedido = normalize(join(RAIZ, url.pathname === "/" ? "index.local.html" : url.pathname));
    if (!archivoPedido.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
    const archivo = await readFile(archivoPedido);
    res.writeHead(200, { "content-type": TIPOS[extname(archivoPedido)] ?? "application/octet-stream", "x-content-type-options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : archivo);
  } catch (e) {
    console.error(e.message);
    res.writeHead(e.code === "ENOENT" || e.code === "EISDIR" ? 404 : 500);
    res.end();
  }
}).listen(PUERTO, "0.0.0.0", () => {   // 0.0.0.0: acepta visitas de afuera (lo necesita Render)
  console.log(`Portal del Saber en http://localhost:${PUERTO}`);
  console.log(LLAVE ? `Rick IA conectado con ${MODELO}` : "Sin ANTHROPIC_API_KEY: Rick usa los retos locales");
});
