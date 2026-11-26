// Rick con inteligencia artificial: le pide a Claude retos nuevos para cada niño.
// Dos caminos, en este orden:
//   1. Publicado en Claude: usa la capacidad "sample" (la IA de la cuenta de quien juega; no hay llave expuesta).
//   2. Corriendo con servidor.mjs: llama a /api/rick, que usa tu ANTHROPIC_API_KEY desde el servidor.
//      El navegador solo manda los DATOS (materia, dificultad, edad…); el servidor arma las instrucciones.
// Si ninguno está disponible, devuelve null y el juego usa los generadores locales (nunca se queda sin retos).
import { Reto } from "../modelo/index.js";
import { armarPalabra } from "../datos/generadores.js";
import { instrucciones, instruccionesMaterial } from "./instrucciones.js";

const LETRAS = ["A", "B", "C"];
function barajar(lista) {
  const l = [...lista];
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l;
}

// Convierte la respuesta de la IA en Retos del modelo, descartando lo que no cumpla el formato.
function aRetos(datos, materia) {
  if (!Array.isArray(datos)) return [];
  const grupos = [];
  for (const d of datos) {
    if (d?.tipo === "armar") {
      if (materia !== "escritura") continue;
      const palabra = String(d.palabra ?? "").toUpperCase().trim();
      if (/^[A-Z]{3,7}$/.test(palabra)) grupos.push(armarPalabra(palabra, String(d.emoji ?? "✨").slice(0, 4)));
      continue;
    }
    const opciones = Array.isArray(d?.opciones) ? d.opciones.map(o => String(o).trim()).filter(Boolean) : [];
    const i = Number(d?.correcta);
    if (!d?.pregunta || opciones.length !== 3 || new Set(opciones).size !== 3 || !(i >= 0 && i <= 2)) continue;
    const correcta = opciones[i];
    const mezcladas = barajar(opciones);
    grupos.push([new Reto(String(d.pregunta).trim(), mezcladas, LETRAS[mezcladas.indexOf(correcta)], String(d.pista ?? "Piensa con calma.").trim())]);
  }
  return grupos;
}

// PATRÓN DE DISEÑO: OBSERVER (observador).
// ¿Para qué? Cuando cambia el estado de la IA ("conectando", "con IA", "sin IA"),
// RickIA avisa a todos los que se suscribieron, sin saber quiénes son.
// ¿Por qué? Así RickIA (servicio) no depende de la Vista: la Vista se suscribe sola
// en main.js con ia.suscribir(...). Se podrían agregar más observadores (por ejemplo,
// un registro de indicadores) sin tocar esta clase.
export class RickIA {
  constructor() {
    this.colas = new Map();       // "materia:dificultad" -> grupos de retos listos
    this.pidiendo = new Set();
    this.pedidos = new Map();
    this.deIA = new WeakSet();    // para mostrar en pantalla qué retos inventó la IA
    this.vistos = [];
    this.fallados = [];
    this.estado = "buscando";     // "sample" | "servidor" | "sin-ia" | "buscando"
    this.sample = null;
    this.observadores = [];      // Observer: lista de funciones a las que se avisa
    // Promesa que se cumple cuando ya se sabe si hay IA (en Render dormido puede tardar casi un minuto).
    this.listo = this.#detectar();
  }

  async #detectar() {
    try {
      this.sample = await window.claude?.use?.("sample") ?? null;
    } catch { this.sample = null; }
    if (this.sample) { this.#poner("sample"); return; }
    try {
      const r = await fetch("api/rick/estado");
      const j = r.ok ? await r.json() : null;
      this.#poner(j?.ok ? "servidor" : "sin-ia");
    } catch { this.#poner("sin-ia"); }
  }

  // Observer: suscribirse para recibir avisos cuando cambie el estado.
  suscribir(observador) {
    this.observadores.push(observador);
    observador(this.estado);
  }
  #notificar() { for (const o of this.observadores) o(this.estado); }

  #poner(e) { this.estado = e; this.#notificar(); }

  disponible() { return this.estado === "sample" || this.estado === "servidor"; }

  // Espera a saber si hay IA (como mucho `ms`) y dice si está disponible.
  async disponibleTras(ms = 70000) {
    await Promise.race([this.listo, new Promise(r => setTimeout(r, ms))]);
    return this.disponible();
  }

  recordarVisto(reto) {
    this.vistos.push(reto.pregunta.split(":")[0]);
    if (this.vistos.length > 12) this.vistos.shift();
  }

  recordarFallo(reto) {
    this.fallados.push(reto.pregunta.split(":")[0]);
    if (this.fallados.length > 3) this.fallados.shift();
  }

  esDeIA(reto) { return this.deIA.has(reto); }

  // Saca un grupo listo de la cola; si no hay de esa dificultad, prueba la vecina (o null si no hay nada).
  tomar(materia, dificultad) {
    for (const d of [dificultad, dificultad - 1, dificultad + 1]) {
      const cola = this.colas.get(`${materia}:${d}`);
      if (cola?.length) return cola.shift();
    }
    return null;
  }

  // Espera (máximo `ms`) a que lleguen los primeros retos de la IA, para empezar el nivel con ellos.
  async esperar(materia, dificultad, ms = 5000) {
    const clave = `${materia}:${dificultad}`;
    if (!this.disponible() || this.colas.get(clave)?.length) return;
    const pedido = this.pedidos.get(clave);
    if (!pedido) return;
    await Promise.race([pedido, new Promise(r => setTimeout(r, ms))]);
  }

  // Pide retos en segundo plano cuando la cola está por acabarse. Se llama desde acciones del jugador.
  precargar(materia, dificultad, edad) {
    const clave = `${materia}:${dificultad}`;
    if (!this.disponible() || this.pidiendo.has(clave) || (this.colas.get(clave)?.length ?? 0) >= 2) return;
    this.pidiendo.add(clave);
    const pedido = this.#pedir("retos", { materia, dificultad, edad: edad || 7, vistos: this.vistos, fallados: this.fallados })
      .then(datos => {
        const grupos = aRetos(datos, materia);
        for (const g of grupos) for (const r of g) this.deIA.add(r);
        this.colas.set(clave, [...(this.colas.get(clave) ?? []), ...grupos]);
        if (this.estado === "buscando" || grupos.length) this.#notificar();
      })
      .catch(e => {
        // Sin permiso o sin IA: el juego sigue con retos locales y no vuelve a preguntar.
        if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e?.code)) this.#poner("sin-ia");
      })
      .finally(() => { this.pidiendo.delete(clave); this.pedidos.delete(clave); });
    this.pedidos.set(clave, pedido);
  }

  // Para el administrador: propone preguntas sacadas SOLO del material del profe.
  // Devuelve lo que contestó la IA tal cual; el controlador lo revisa contra el material antes de usarlo.
  async preguntasDesdeMaterial(material, edad = 7, cantidad = 15) {
    if (!this.disponible()) throw new Error("sin-ia");
    return this.#pedir("material", { material, edad, cantidad });
  }

  // Para el administrador: pasa a texto una foto o un PDF escaneado (base64). Solo con servidor.mjs,
  // que arma las instrucciones y limita los pedidos. El profe revisa el texto antes de usarlo.
  async transcribir(mediaType, base64) {
    if (this.estado !== "servidor") {
      const error = new Error(this.estado === "sample" ? "solo-servidor" : "sin-ia");
      error.codigo = error.message;
      throw error;
    }
    const r = await fetch("api/rick/transcribir", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaType, datos: base64 }),
    });
    if (!r.ok) {
      const error = new Error(`servidor ${r.status}`);
      error.status = r.status;
      throw error;
    }
    return (await r.json()).texto ?? "";
  }

  // Con "sample" (publicado en Claude) el navegador arma las instrucciones, porque usa la cuenta de quien juega.
  // Con el servidor solo se mandan los datos y el servidor arma las instrucciones:
  // así nadie puede usar la llave del servidor para pedirle a la IA otra cosa.
  async #pedir(tipo, datos) {
    if (this.estado === "sample") {
      const prompt = tipo === "material"
        ? instruccionesMaterial(datos.material, datos.edad, datos.cantidad)
        : instrucciones(datos.materia, datos.dificultad, datos.edad, { vistos: datos.vistos, fallados: datos.fallados });
      return this.sample.json(prompt, { modelTier: "quick", cache: false });
    }
    const r = await fetch(tipo === "material" ? "api/rick/material" : "api/rick", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
    });
    if (!r.ok) {
      const error = new Error(`servidor ${r.status}`);
      error.status = r.status;
      throw error;
    }
    return r.json();
  }
}
