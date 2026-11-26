// Vista 3D con WebGL (Three.js). Dibuja el garaje de Rick, las dimensiones y al jugador.
// No tiene lógica de juego: avisa a la Interfaz cuando el jugador toca un portal o un cristal.
import * as THREE from "three";

const COLORES = {
  portal: 0x7cf03c,
  portalBloqueado: 0x5a6a6c,
  holograma: 0x6dfbd2,
  piso: 0x1d3438,
};

const MATERIAS = {
  lectura: { cielo: 0x2a1747, piso: 0x4b2c7a, acento: 0xd59bff, simbolos: ["A", "B", "M", "S", "L", "E"] },
  matematicas: { cielo: 0x3a1c0c, piso: 0x7a3d14, acento: 0xffb054, simbolos: ["1", "2", "3", "+", "−", "×"] },
  escritura: { cielo: 0x0c2440, piso: 0x1b4a73, acento: 0x7cc4ff, simbolos: ["á", "?", "ñ", "¿", ".", "!"] },
  // Mundos creados desde el material del profe.
  material: { cielo: 0x0b2a26, piso: 0x17564a, acento: 0x6dfbd2, simbolos: ["?", "!", "★", "¿", "✓", "i"] },
};

const CUERPOS = {
  explorador: { color: 0xf2a541, piel: 0xf6d1b0 },
  cientifica: { color: 0xeef3f0, piel: 0xc98f6b },
  robot: { color: 0x9fb6c3, piel: 0x7f97a5 },
};

function texturaTexto(texto, { ancho = 512, alto = 128, fondo = null, color = "#eafff0", fuente = "Bungee", tam = 64 } = {}) {
  const c = document.createElement("canvas");
  c.width = ancho; c.height = alto;
  const g = c.getContext("2d");
  if (fondo) {
    g.fillStyle = fondo;
    g.beginPath();
    g.roundRect(4, 4, ancho - 8, alto - 8, 28);
    g.fill();
  }
  g.fillStyle = color;
  g.font = `${tam}px ${fuente}, "Arial Black", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(texto, ancho / 2, alto / 2 + 4, ancho - 24);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function etiqueta(texto, opciones = {}) {
  const { escala = 2.6, ...resto } = opciones;
  const mat = new THREE.SpriteMaterial({ map: texturaTexto(texto, resto), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(escala, escala / 4, 1);
  return s;
}

function materialRemolino(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: { tiempo: { value: 0 }, color: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float tiempo; uniform vec3 color;
      void main(){
        vec2 p = vUv - 0.5; float r = length(p) * 2.0;
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float espiral = sin(a * 3.0 + r * 12.0 - tiempo * 4.0) * 0.5 + 0.5;
        float brillo = mix(0.35, 1.0, espiral) * (1.0 - r * 0.55);
        gl_FragColor = vec4(color * brillo + vec3(0.15) * (1.0 - r), 0.92);
      }`,
  });
}

export class Mundo3D {
  constructor(canvas, eventos) {
    this.eventos = eventos;   // { alTocarPortal(dim), alTocarCristal(n), alTocarRegreso() }
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.reloj = new THREE.Clock();
    this.teclas = new Set();
    this.joystick = { x: 0, y: 0 };
    this.destino = null;
    this.pausado = false;
    this.activo = false;
    this.disparadores = [];
    this.animables = [];
    this.raycaster = new THREE.Raycaster();
    this.mundo = new THREE.Group();
    this.scene.add(this.mundo);

    this.scene.add(new THREE.HemisphereLight(0xcffff0, 0x1a2428, 1.1));
    const sol = new THREE.DirectionalLight(0xffffff, 1.4);
    sol.position.set(6, 12, 8);
    this.scene.add(sol);

    this.jugador = new THREE.Group();
    this.morty = this.crearMorty();
    this.holo = this.#crearHolograma();
    this.grupoOrbes = new THREE.Group();
    this.grupoLetras = new THREE.Group();
    this.grupoMaterial = new THREE.Group();
    this.scene.add(this.jugador, this.morty, this.holo, this.grupoOrbes, this.grupoLetras, this.grupoMaterial);
    this.respuestas = [];      // orbes y letras que se pueden atrapar
    this.particulas = [];
    this.animo = { tipo: "normal", hasta: 0 };   // reacción de los personajes

    this.#escuchar(canvas);
    this.#ajustar();
    window.addEventListener("resize", () => this.#ajustar());
    this.renderer.setAnimationLoop(() => this.#cuadro());
  }

  // ---------- Avatar ----------
  construirAvatar(personaje) {
    this.jugador.clear();
    const tipo = personaje?.tipo ?? "explorador";
    const { color, piel } = CUERPOS[tipo];
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const matPiel = new THREE.MeshStandardMaterial({ color: piel, roughness: 0.8 });
    let cuerpo, cabeza;
    if (tipo === "robot") {
      cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.55), mat);
      cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), matPiel);
      const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), mat);
      antena.position.set(0, 1.75, 0);
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshStandardMaterial({ color: 0x7cf03c, emissive: 0x3f8f10 }));
      bola.position.set(0, 1.95, 0);
      this.jugador.add(antena, bola);
    } else if (tipo === "cientifica") {
      cuerpo = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 20), mat);
      cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), matPiel);
      const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3b2316 }));
      pelo.position.set(0, 1.42, -0.02);
      this.jugador.add(pelo);
    } else {
      cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.45, 6, 16), mat);
      cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), matPiel);
    }
    cuerpo.position.y = 0.6;
    cabeza.position.y = 1.35;
    // Ojos (miran hacia +z, que es "adelante")
    const ojo = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const x of [-0.1, 0.1]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.045), ojo);
      o.position.set(x, 1.4, tipo === "robot" ? 0.26 : 0.29);
      this.jugador.add(o);
    }
    this.jugador.add(cuerpo, cabeza);

    const acc = personaje?.accesorios ?? [];
    if (acc.includes("gafas")) {
      const g = new THREE.MeshStandardMaterial({ color: 0x7cf03c, emissive: 0x2c6b0a });
      for (const x of [-0.11, 0.11]) {
        const l = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 20), g);
        l.position.set(x, 1.4, tipo === "robot" ? 0.27 : 0.3);
        this.jugador.add(l);
      }
    }
    if (acc.includes("gorro")) {
      const gorro = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 20), new THREE.MeshStandardMaterial({ color: 0xff6f59 }));
      gorro.position.y = tipo === "robot" ? 1.82 : 1.78;
      this.jugador.add(gorro);
    }
    if (acc.includes("mochila")) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.25), new THREE.MeshStandardMaterial({ color: 0x3a7d44 }));
      m.position.set(0, 0.75, -0.38);
      this.jugador.add(m);
    }
  }

  crearMorty() {
    // Compañero del jugador: un avatar sencillo de formas básicas, sin copiar el diseño de la serie.
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.25, 4, 12), new THREE.MeshStandardMaterial({ color: 0x48c9b0 }));
    cuerpo.position.y = 0.35;
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe9d8c4 }));
    cabeza.position.y = 0.78;
    const nombre = etiqueta("MORTY", { escala: 1.5, tam: 70, color: "#bff7ea", fondo: "rgba(10,25,28,0.6)" });
    nombre.position.y = 1.35;
    const ojo = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const x of [-0.07, 0.07]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.035), ojo);
      o.position.set(x, 0.82, 0.18);
      cabeza.add(o);
      o.position.y -= 0.78;
    }
    g.add(cuerpo, cabeza, nombre);
    g.userData = { cabeza, cuerpo };
    g.position.set(-1.2, 0, 0);
    return g;
  }


  // ---------- Holograma del científico (diseño propio del juego) ----------
  #crearHolograma() {
    const g = new THREE.Group();
    const dron = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3b5458, metalness: 0.7, roughness: 0.3 }));
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 32), new THREE.MeshStandardMaterial({ color: COLORES.holograma, emissive: COLORES.holograma, emissiveIntensity: 0.8 }));
    anillo.rotation.x = Math.PI / 2;
    const haz = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: COLORES.holograma, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    haz.position.y = 0.75;
    this.caraCanvas = document.createElement("canvas");
    this.caraCanvas.width = this.caraCanvas.height = 256;
    this.caraTextura = new THREE.CanvasTexture(this.caraCanvas);
    this.caraTextura.colorSpace = THREE.SRGBColorSpace;
    const pantalla = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.caraTextura, transparent: true, depthWrite: false }));
    pantalla.scale.set(1.25, 1.25, 1);
    pantalla.position.y = 1.55;
    g.add(dron, anillo, haz, pantalla);
    g.userData = { anillo, haz, pantalla };
    this.#dibujarCara("normal");
    return g;
  }

  // Cara de pantalla holográfica: ojos y boca simples que cambian con el ánimo.
  #dibujarCara(estado) {
    const g = this.caraCanvas.getContext("2d");
    const color = estado === "mal" ? "#ff9b85" : "#d9fff3";
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = estado === "mal" ? "rgba(255,110,80,0.28)" : "rgba(40,180,150,0.32)";
    g.beginPath(); g.roundRect(18, 18, 220, 190, 34); g.fill();
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 12; g.lineCap = "round";
    for (let y = 30; y < 200; y += 10) { g.globalAlpha = 0.08; g.fillRect(22, y, 212, 3); }
    g.globalAlpha = 1;
    if (estado === "bien" || estado === "fiesta") {
      for (const x of [88, 168]) { g.beginPath(); g.arc(x, 100, 18, Math.PI, 0); g.stroke(); }
      g.beginPath(); g.arc(128, 128, 42, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    } else if (estado === "mal") {
      for (const x of [88, 168]) { g.beginPath(); g.arc(x, 96, 13, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(128, 160, 18, 0, Math.PI * 2); g.stroke();
    } else {
      for (const x of [88, 168]) { g.beginPath(); g.arc(x, 96, 13, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.moveTo(98, 150); g.lineTo(158, 144); g.stroke();
    }
    g.font = '28px Bungee, "Arial Black", sans-serif';
    g.textAlign = "center";
    g.fillText("RICK", 128, 240);
    this.caraTextura.needsUpdate = true;
  }

  // tipo: "bien" | "mal" | "fiesta"
  reaccion(tipo, racha = 0) {
    this.animo = { tipo, hasta: this.reloj.elapsedTime + (tipo === "fiesta" ? 2.5 : 1.1), racha };
    this.#dibujarCara(tipo);
    if (tipo === "bien") this.#chispas(this.jugador.position, Math.min(10 + racha * 4, 40), racha >= 3 ? 0xffd166 : 0x7cf03c);
    if (tipo === "fiesta") this.#chispas(this.jugador.position, 60, 0xffd166);
  }

  #animarPersonajes(t, dt) {
    const p = this.jugador.position;
    const rot = this.jugador.rotation.y;
    const eje = new THREE.Vector3(0, 1, 0);
    const reaccionando = t < this.animo.hasta;
    if (!reaccionando && this.animo.tipo !== "normal") { this.animo.tipo = "normal"; this.#dibujarCara("normal"); }
    const tipo = reaccionando ? this.animo.tipo : "normal";

    // Holograma: flota al otro lado del jugador.
    const lado = new THREE.Vector3(-1.6, 0, -1.1).applyAxisAngle(eje, rot);   // detrás y a un lado: no tapa las respuestas
    const metaH = p.clone().add(lado);
    this.holo.position.x += (metaH.x - this.holo.position.x) * Math.min(1, dt * 3);
    this.holo.position.z += (metaH.z - this.holo.position.z) * Math.min(1, dt * 3);
    const { anillo, haz, pantalla } = this.holo.userData;
    const salto = tipo === "bien" ? Math.abs(Math.sin(t * 10)) * 0.35 : tipo === "fiesta" ? Math.abs(Math.sin(t * 8)) * 0.6 : 0;
    this.holo.position.y = 1.2 + Math.sin(t * 2) * 0.1 + salto;
    anillo.rotation.z += dt * (tipo === "normal" ? 1.5 : 9);
    haz.material.opacity = tipo === "mal" ? (Math.sin(t * 40) > 0 ? 0.25 : 0.04) : 0.1 + Math.sin(t * 6) * 0.03;
    haz.material.color.setHex(tipo === "mal" ? 0xff7a59 : COLORES.holograma);
    pantalla.material.rotation = tipo === "mal" ? Math.sin(t * 30) * 0.06 : 0;

    // Compañero: salta al acertar, niega al fallar, gira en la fiesta.
    const { cabeza, cuerpo } = this.morty.userData;
    const brinco = tipo === "bien" ? Math.abs(Math.sin(t * 12)) * 0.45 : tipo === "fiesta" ? Math.abs(Math.sin(t * 9)) * 0.7 : 0;
    this.morty.position.y = Math.sin(t * 3) * 0.05 + brinco;
    cabeza.rotation.y = tipo === "mal" ? Math.sin(t * 18) * 0.5 : 0;
    if (tipo === "fiesta") this.morty.rotation.y += dt * 10;
    else this.morty.rotation.y = rot;
    cuerpo.scale.y = 1 + (tipo === "bien" ? Math.sin(t * 24) * 0.08 : 0);
  }

  #chispas(origen, cantidad, color) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < cantidad; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.position.set(origen.x, 1.2, origen.z);
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 6);
      this.scene.add(m);
      this.particulas.push({ m, v, vida: 1 });
    }
  }

  #animarParticulas(dt) {
    for (const q of this.particulas) {
      q.vida -= dt * 1.1;
      if (!q.fijo) q.v.y -= 12 * dt;
      q.m.position.addScaledVector(q.v, dt);
      if (!q.fijo) q.m.rotation.x += dt * 8;
      q.m.material.opacity = Math.max(0, q.vida);
    }
    const muertas = this.particulas.filter(q => q.vida <= 0);
    for (const q of muertas) { this.scene.remove(q.m); q.m.material.dispose(); }
    if (muertas.length) this.particulas = this.particulas.filter(q => q.vida > 0);
  }


  // ---------- Guardián de dimensión (monstruo original del juego) ----------
  mostrarJefe(vidas) {
    this.ocultarJefe();
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color: 0x3a1f5c, emissive: 0x2a0f45, roughness: 0.4, flatShading: true }));
    g.add(cuerpo);
    const puas = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0x6b0f22 });
    for (let k = 0; k < 10; k++) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 8), puas);
      const dir = new THREE.Vector3(Math.cos(k * 2.4) * Math.sin(k), Math.cos(k), Math.sin(k * 2.4) * Math.sin(k)).normalize();
      p.position.copy(dir.clone().multiplyScalar(1.55));
      p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(p);
    }
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333 }));
    ojo.position.set(0, 0.2, 1.15);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pupila.position.set(0, 0, 0.42);
    ojo.add(pupila);
    g.add(ojo);
    this.vidaCanvas = document.createElement("canvas");
    this.vidaCanvas.width = 512; this.vidaCanvas.height = 96;
    this.vidaTextura = new THREE.CanvasTexture(this.vidaCanvas);
    const barra = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.vidaTextura, transparent: true, depthWrite: false }));
    barra.scale.set(4, 0.75, 1);
    barra.position.y = 2.6;
    g.add(barra);
    g.position.set(0, 3.2, -10);
    this.jefe = { g, cuerpo, ojo, pupila, vida: vidas, max: vidas, golpe: 0, muriendo: 0 };
    this.#pintarVida();
    this.scene.add(g);
  }

  #pintarVida() {
    const j = this.jefe;
    const c = this.vidaCanvas.getContext("2d");
    c.clearRect(0, 0, 512, 96);
    c.fillStyle = "rgba(20,8,30,0.85)"; c.beginPath(); c.roundRect(4, 20, 504, 60, 30); c.fill();
    const ancho = 480 / j.max;
    for (let k = 0; k < j.max; k++) {
      c.fillStyle = k < j.vida ? "#ff4d6d" : "#3b2a44";
      c.beginPath(); c.roundRect(16 + k * ancho, 32, ancho - 10, 36, 14); c.fill();
    }
    this.vidaTextura.needsUpdate = true;
  }

  golpearJefe(vidaRestante, max, golpeLimpio) {
    if (!this.jefe) return;
    this.jefe.vida = vidaRestante;
    this.jefe.max = max;
    this.jefe.golpe = 0.5;
    this.#pintarVida();
    // Rayo del holograma al guardián
    const desde = this.holo.position.clone();
    const hasta = this.jefe.g.position.clone();
    const rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, desde.distanceTo(hasta), 8),
      new THREE.MeshBasicMaterial({ color: golpeLimpio ? 0x7cf03c : 0x6dfbd2, transparent: true, opacity: 0.9 }));
    rayo.position.copy(desde).lerp(hasta, 0.5);
    rayo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hasta.clone().sub(desde).normalize());
    this.scene.add(rayo);
    this.particulas.push({ m: rayo, v: new THREE.Vector3(), vida: 0.5, fijo: true });
    this.#chispas(hasta, 24, 0xff4d6d);
  }

  derrotarJefe() {
    if (!this.jefe) return;
    this.jefe.muriendo = 1;
    this.#chispas(this.jefe.g.position, 80, 0xffd166);
  }

  ocultarJefe() {
    if (!this.jefe) return;
    this.scene.remove(this.jefe.g);
    this.#vaciar(this.jefe.g);
    this.jefe = null;
  }

  #animarJefe(t, dt) {
    const j = this.jefe;
    if (!j) return;
    if (j.muriendo > 0) {
      j.muriendo -= dt * 0.8;
      j.g.scale.setScalar(Math.max(0.01, j.muriendo));
      j.g.rotation.y += dt * 12;
      if (j.muriendo <= 0) this.ocultarJefe();
      return;
    }
    j.g.position.y = 3.2 + Math.sin(t * 1.5) * 0.3;
    j.cuerpo.rotation.y += dt * 0.4;
    // El ojo sigue al jugador
    const mira = this.jugador.position.clone().sub(j.g.position).normalize();
    j.pupila.position.set(mira.x * 0.25, mira.y * 0.15 + 0.05, 0.42);
    if (j.golpe > 0) {
      j.golpe -= dt;
      j.g.position.x = Math.sin(t * 60) * 0.25 * j.golpe * 2;
      j.cuerpo.material.emissive.setHex(0xff2b4a);
    } else {
      j.g.position.x = 0;
      j.cuerpo.material.emissive.setHex(0x2a0f45);
    }
  }

  // ---------- Inventos que cambian el mundo ----------
  alternarEfecto(efecto) {
    this.efectos ??= new Set();
    if (this.efectos.has(efecto)) this.efectos.delete(efecto); else this.efectos.add(efecto);
    return this.efectos.has(efecto);
  }

  tieneEfecto(efecto) { return this.efectos?.has(efecto) ?? false; }

  saltar() {
    if (!this.activo || this.pausado || (this.altura ?? 0) > 0.01) return;
    this.velVertical = this.tieneEfecto("saltar") ? 13 : 6.5;
  }

  encoger() {
    this.encogidoHasta = this.reloj.elapsedTime + 6;
  }

  // ---------- Respuestas en el mundo ----------
  #vaciar(grupo) {
    grupo.traverse(o => { o.geometry?.dispose?.(); if (o.material) [o.material].flat().forEach(m => { m.map?.dispose?.(); m.dispose?.(); }); });
    grupo.clear();
  }

  limpiarReto(todo = false) {
    this.#vaciar(this.grupoOrbes);
    this.#vaciar(this.grupoMaterial);
    if (todo) { this.#vaciar(this.grupoLetras); this.palabraEnMundo = null; }
    this.respuestas = this.respuestas.filter(r => !todo && r.tipo === "letra" && !r.quitado);
  }

  // Orbes de opción múltiple: aparecen delante del jugador; hay que correr hasta la correcta.
  mostrarOrbes(opciones, alTocar) {
    this.limpiarReto(true);
    const colores = [0xff7ab6, 0x7cc4ff, 0xffd166];
    const p = this.jugador.position;
    const lugares = [[-3.4, -2.6], [0, -3.8], [3.4, -2.6]];
    opciones.forEach((op, i) => {
      const g = new THREE.Group();
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshStandardMaterial({ color: colores[i], emissive: colores[i], emissiveIntensity: 0.55, transparent: true, opacity: 0.9 }));
      esfera.position.y = 1;
      const texto = op.texto.length > 14 ? `${op.texto.slice(0, 13)}…` : op.texto;
      const rot = etiqueta(`${op.clave} · ${texto}`, { fondo: "rgba(8,18,20,0.85)", tam: 46, escala: 3.2 });
      rot.position.y = 2.05;
      g.add(esfera, rot);
      let [x, z] = [p.x + lugares[i][0], p.z + lugares[i][1]];
      const d = Math.hypot(x, z), lim = (this.limite ?? 13) - 1;
      if (d > lim) { x *= lim / d; z *= lim / d; }
      g.position.set(x, 0, z);
      const fase = i * 1.7;
      this.animables.push(t => { esfera.position.y = 1 + Math.sin(t * 2.5 + fase) * 0.18; });
      this.grupoOrbes.add(g);
      this.respuestas.push({ tipo: "orbe", clave: op.clave, objeto: g, esfera, alTocar, dentro: false, quitado: false });
    });
  }

  // Letras para armar una palabra: flotan por toda la dimensión y se atrapan en orden.
  mostrarLetras(letras, clavePalabra, alTocar) {
    this.#vaciar(this.grupoOrbes);
    this.#vaciar(this.grupoMaterial);
    if (this.palabraEnMundo === clavePalabra) {
      for (const r of this.respuestas) if (r.tipo === "letra") r.alTocar = alTocar;
      return;
    }
    this.limpiarReto(true);
    this.palabraEnMundo = clavePalabra;
    const n = letras.length;
    letras.forEach((letra, i) => {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = 4 + Math.random() * 5;
      const caja = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({
        map: texturaTexto(letra, { ancho: 128, alto: 128, fondo: "#f4fbff", color: "#12324f", tam: 96 }),
        emissive: 0x2a6fa8, emissiveIntensity: 0.25,
      }));
      caja.position.set(Math.cos(ang) * r, 1, Math.sin(ang) * r - 1);
      const fase = i * 0.9;
      this.animables.push(t => { if (caja.parent) { caja.rotation.y = t * 0.8 + fase; caja.position.y = 1 + Math.sin(t * 2 + fase) * 0.2; } });
      this.grupoLetras.add(caja);
      this.respuestas.push({ tipo: "letra", clave: letra, objeto: caja, alTocar, dentro: false, quitado: false });
    });
  }

  letrasActuales() {
    return this.respuestas.filter(r => r.tipo === "letra" && !r.quitado).map(r => r.clave);
  }

  // Marca un orbe o letra: verde si estaba bien, rojo si no.
  marcar(clave, correcta) {
    const r = this.respuestas.find(x => x.clave === clave && !x.quitado);
    if (!r) return;
    const mesh = r.esfera ?? r.objeto;
    const mat = mesh.material;
    const original = mat.emissive.getHex();
    mat.emissive.setHex(correcta ? 0x3cff6a : 0xff3b2f);
    mat.emissiveIntensity = 0.9;
    if (correcta && r.tipo === "letra") {
      this.quitar(clave, true);
    } else {
      setTimeout(() => { if (mat.emissive) { mat.emissive.setHex(original); mat.emissiveIntensity = 0.4; } }, 500);
      if (!correcta) {
        // Rebote: empuja al jugador hacia atrás un poco.
        const v = this.jugador.position.clone().sub(r.objeto.position).setY(0).normalize().multiplyScalar(1.2);
        this.jugador.position.add(v);
      }
    }
  }

  quitar(clave, recogida = false) {
    const r = this.respuestas.find(x => x.clave === clave && !x.quitado);
    if (!r) return;
    r.quitado = true;
    if (recogida) this.#chispas(r.objeto.position, 14, 0x7cc4ff);
    r.objeto.parent?.remove(r.objeto);
  }

  // Material para contar: gemas que flotan delante del jugador (una fila por número).
  mostrarMaterial(a, b, operacion) {
    this.#vaciar(this.grupoMaterial);
    const p = this.jugador.position;
    const fila = (cantidad, y, color, tachadas = 0) => {
      for (let i = 0; i < cantidad; i++) {
        const quitada = i >= cantidad - tachadas;
        const gema = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshStandardMaterial({
          color: quitada ? 0xff7a59 : color, emissive: quitada ? 0x5a1a0e : color, emissiveIntensity: 0.4,
          transparent: quitada, opacity: quitada ? 0.35 : 1,
        }));
        gema.position.set(p.x + (i - (cantidad - 1) / 2) * 0.55, y, p.z - 6.5);
        const fase = i * 0.5;
        this.animables.push(t => { gema.rotation.y = t * 1.5 + fase; });
        this.grupoMaterial.add(gema);
      }
    };
    if (operacion === "+") { fila(a, 4.2, 0x7cf03c); fila(b, 3.5, 0x6dc6ff); }
    else { fila(a, 3.9, 0x7cf03c, b); }
  }

  // ---------- Escenas ----------
  #limpiar() {
    this.mundo.traverse(o => {
      o.geometry?.dispose?.();
      if (o.material) [o.material].flat().forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
    });
    this.mundo.clear();
    this.limpiarReto(true);
    this.ocultarJefe();
    this.disparadores = [];
    this.animables = [];
    this.limite = 14;
  }

  #portal(x, z, texto, abierto, alTocar, color = COLORES.portal) {
    const g = new THREE.Group();
    const c = abierto ? color : COLORES.portalBloqueado;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.14, 16, 48), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: abierto ? 0.6 : 0.1 }));
    const disco = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), materialRemolino(c));
    const rotulo = etiqueta(texto, { fondo: "rgba(10,25,28,0.8)", tam: 40, escala: 3.6 });
    rotulo.position.y = 1.85;
    g.add(aro, disco, rotulo);
    if (!abierto) {
      const candado = etiqueta("BLOQUEADA", { fondo: "rgba(80,20,20,0.85)", tam: 44, escala: 2.2, color: "#ffd9cf" });
      candado.position.y = -0.1;
      candado.position.z = 0.1;
      g.add(candado);
    }
    g.position.set(x, 1.45, z);
    g.lookAt(0, 1.45, 0);
    this.animables.push(t => { disco.material.uniforms.tiempo.value = t; });
    this.mundo.add(g);
    this.disparadores.push({ objeto: g, x, z, radio: 1.5, alTocar, dentro: false });
  }

  mostrarGaraje(dimensiones, estados = []) {
    this.#limpiar();
    this.scene.background = new THREE.Color(0x0e1c1f);
    this.scene.fog = new THREE.Fog(0x0e1c1f, 18, 40);

    // Piso con baldosas
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#1f3a3f"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#2c5157"; g.lineWidth = 6; g.strokeRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    piso.rotation.x = -Math.PI / 2;
    this.mundo.add(piso);

    // Paredes del garaje
    const pared = new THREE.MeshStandardMaterial({ color: 0x2a4247, roughness: 1 });
    for (const [x, z, w, d] of [[0, -16, 34, 0.5], [-16, 0, 0.5, 34], [16, 0, 0.5, 34]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), pared);
      m.position.set(x, 2.5, z);
      this.mundo.add(m);
    }
    // Mesa de trabajo con frascos que brillan
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 1.6), new THREE.MeshStandardMaterial({ color: 0x6b4a2f }));
    mesa.position.set(-8, 0.5, -13.5);
    this.mundo.add(mesa);
    [0x7cf03c, 0x6dfbd2, 0xffb054, 0xd59bff].forEach((col, i) => {
      const frasco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 }));
      frasco.position.set(-10 + i * 1.3, 1.3, -13.5);
      this.mundo.add(frasco);
    });
    const estante = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 1), new THREE.MeshStandardMaterial({ color: 0x4f3a28 }));
    estante.position.set(8, 2.6, -15.4);
    this.mundo.add(estante);
    const lampara = new THREE.PointLight(0xc8ffd8, 30, 26);
    lampara.position.set(0, 6, 2);
    this.mundo.add(lampara);


    // Un portal por dimensión, en semicírculo
    const n = dimensiones.length;
    dimensiones.forEach((d, i) => {
      const ang = n === 1 ? 0 : -0.62 + (1.24 * i) / (n - 1);
      const x = Math.sin(ang) * 9;
      const z = -Math.cos(ang) * 9 + 1;
      // "Dimensión de las Letras" → LETRAS; "Dimensión: El ciclo del agua" → EL CICLO DEL AGUA
      const rotulo = d.nombre.replace(/^Dimensi[oó]n(\s+del?\s+(las |los |la |el )?|\s*:\s*)/i, "").toUpperCase();
      this.#portal(x, z, rotulo, d.desbloqueada, () => this.eventos.alTocarPortal(d));
      const e = estados[i];
      if (e && d.desbloqueada) {
        const marcas = "★".repeat(e.completados) + "☆".repeat(e.total - e.completados) + (e.jefeVencido ? " ♛" : "");
        const est = etiqueta(marcas, { tam: 54, escala: 2.4, color: "#ffd166", fuente: "Arial" });
        est.position.set(x, 3.75, z);
        this.mundo.add(est);
      }
    });

    this.#colocarJugador(0, 6);
  }

  mostrarDimension(dimension, estado = null) {
    this.#limpiar();
    const est = MATERIAS[dimension.materia] ?? MATERIAS.lectura;
    this.scene.background = new THREE.Color(est.cielo);
    this.scene.fog = new THREE.Fog(est.cielo, 16, 38);

    const piso = new THREE.Mesh(new THREE.CircleGeometry(15, 64), new THREE.MeshStandardMaterial({ color: est.piso, roughness: 1 }));
    piso.rotation.x = -Math.PI / 2;
    this.mundo.add(piso);
    const borde = new THREE.Mesh(new THREE.TorusGeometry(15, 0.15, 8, 96), new THREE.MeshStandardMaterial({ color: est.acento, emissive: est.acento, emissiveIntensity: 0.5 }));
    borde.rotation.x = Math.PI / 2;
    this.mundo.add(borde);

    // Símbolos flotantes de la materia
    for (let i = 0; i < 18; i++) {
      const s = est.simbolos[i % est.simbolos.length];
      const cubo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({
        map: texturaTexto(s, { ancho: 128, alto: 128, fondo: "#ffffff", color: "#1d1d2b", tam: 90 }),
      }));
      const ang = (i / 18) * Math.PI * 2;
      const r = 17 + (i % 3) * 2;
      cubo.position.set(Math.cos(ang) * r, 2 + (i % 4), Math.sin(ang) * r);
      const fase = i * 0.7;
      this.animables.push(t => { cubo.rotation.y = t * 0.4 + fase; cubo.position.y = 2 + (i % 4) + Math.sin(t + fase) * 0.4; });
      this.mundo.add(cubo);
    }

    // Cristales: un nivel cada uno (Interactuar con objeto). El último es el guardián.
    const dificultades = ["FÁCIL", "MEDIO", "DIFÍCIL"];
    const n = dimension.niveles.length;
    dimension.niveles.forEach((nivel, i) => {
      const esJefe = nivel.dificultad === "jefe";
      const x = (i - (n - 1) / 2) * 3.6;
      const z = esJefe ? -7 : -5;
      const completo = estado?.niveles.find(v => v.numero === nivel.numero)?.completo;
      const color = esJefe ? 0xff4d6d : est.acento;
      const despierto = !esJefe || estado?.jefeDespierto || estado?.jefeVencido;
      const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(esJefe ? 1.15 : 0.8), new THREE.MeshStandardMaterial({
        color: despierto ? color : 0x4a4a55, emissive: despierto ? color : 0x111118, emissiveIntensity: 0.45, flatShading: true,
      }));
      cristal.position.set(x, 1.4, z);
      const titulo = esJefe ? (estado?.jefeVencido ? "GUARDIÁN ♛" : "GUARDIÁN") : `NIVEL ${nivel.numero}${completo ? " ★" : ""}`;
      const rot = etiqueta(titulo, { fondo: esJefe ? "rgba(90,10,30,0.75)" : "rgba(0,0,0,0.55)", tam: 50, escala: 2.6, color: completo ? "#ffd166" : "#eafff0" });
      rot.position.set(x, esJefe ? 3.2 : 2.8, z);
      const sub = esJefe ? (despierto ? "¡DESPIERTO!" : "DORMIDO") : (dificultades[i] ?? nivel.dificultad.toUpperCase());
      const dif = etiqueta(sub, { tam: 40, escala: 1.8, color: "#ffffffcc" });
      dif.position.set(x, 0.25, z + 1.1);
      this.mundo.add(cristal, rot, dif);
      this.animables.push(t => { cristal.rotation.y = t * (esJefe ? 0.6 : 1) + i; cristal.position.y = 1.4 + Math.sin(t * 2 + i) * 0.15; });
      this.disparadores.push({ objeto: cristal, x, z, radio: esJefe ? 1.6 : 1.4, alTocar: () => this.eventos.alTocarCristal(nivel.numero), dentro: false });
    });

    // Zonas prohibidas: charcos de fluido de portal (como las reglas "expulsar" del Motor del Multiverso).
    for (const [x, z] of [[-7.5, 3], [6, 8.5]]) this.#charco(x, z);

    this.#portal(10.5, 4, "GARAJE", true, () => this.eventos.alTocarRegreso());
    this.#colocarJugador(0, 4);
    this.limite = 13.5;
  }

  #charco(x, z) {
    const radio = 1.5;
    const mat = new THREE.MeshStandardMaterial({ color: 0x7cf03c, emissive: 0x3fbf1a, emissiveIntensity: 0.7, transparent: true, opacity: 0.85, roughness: 0.2 });
    const charco = new THREE.Mesh(new THREE.CircleGeometry(radio, 40), mat);
    charco.rotation.x = -Math.PI / 2;
    charco.position.set(x, 0.03, z);
    const aviso = etiqueta("¡FLUIDO! −5", { fondo: "rgba(30,60,10,0.8)", tam: 40, escala: 2, color: "#d8ffc4" });
    aviso.position.set(x, 1.3, z);
    this.mundo.add(charco, aviso);
    // Burbujas que suben y bajan
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12 + i * 0.03, 10, 8), mat);
      const a = i * 1.6, r = 0.4 + (i % 2) * 0.5;
      b.position.set(x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r);
      this.mundo.add(b);
      this.animables.push(t => { b.position.y = 0.05 + Math.abs(Math.sin(t * 2 + i)) * 0.25; });
    }
    this.animables.push(t => { mat.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.2; });
    this.disparadores.push({
      objeto: charco, x, z, radio, charco: true, dentro: false,
      alTocar: () => {
        // Empuja al jugador fuera del charco y avisa al controlador.
        const p = this.jugador.position;
        const v = new THREE.Vector3(p.x - x, 0, p.z - z);
        if (v.lengthSq() < 0.01) v.set(0, 0, 1);
        v.normalize().multiplyScalar(radio + 1.3);
        p.x = x + v.x; p.z = z + v.z;
        this.#chispas(p, 18, 0x7cf03c);
        this.eventos.alPisarCharco?.();
      },
    });
  }

  #colocarJugador(x, z) {
    this.jugador.position.set(x, 0, z);
    this.jugador.rotation.y = Math.PI;
    this.morty.position.set(x - 1.1, 0, z + 0.8);
    this.holo.position.set(x + 1.6, 1.2, z + 1.1);
    this.destino = null;
    // Al aparecer, ningún disparador cuenta como "tocado" hasta salir y volver a entrar.
    for (const d of this.disparadores) d.dentro = Math.hypot(d.x - x, d.z - z) < d.radio;
  }

  // ---------- Entrada (teclado, toque, clic) ----------
  #escuchar(canvas) {
    window.addEventListener("keydown", e => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === " " && this.activo) e.preventDefault();   // la barra espaciadora es para saltar
      this.teclas.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", e => this.teclas.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.teclas.clear());
    canvas.addEventListener("pointerdown", e => this.#tocar(e, canvas));
  }

  #tocar(e, canvas) {
    if (!this.activo || this.pausado) return;
    const r = canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.camera);
    // ¿Tocó un orbe o una letra? Camina hacia ella.
    for (const r of this.respuestas) {
      if (!r.quitado && this.raycaster.intersectObject(r.objeto, true).length) {
        this.destino = new THREE.Vector3(r.objeto.position.x, 0, r.objeto.position.z);
        return;
      }
    }
    // ¿Tocó un portal o cristal? Camina hacia él.
    for (const d of this.disparadores) {
      if (this.raycaster.intersectObject(d.objeto, true).length) {
        this.destino = new THREE.Vector3(d.x, 0, d.z);
        return;
      }
    }
    // Si no, camina al punto del piso.
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const punto = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plano, punto)) this.destino = punto;
  }

  // ---------- Bucle ----------
  #cuadro() {
    const dt = Math.min(this.reloj.getDelta(), 0.05);
    const t = this.reloj.elapsedTime;
    for (const a of this.animables) a(t);
    if (this.activo && !this.pausado) this.#mover(dt);
    this.#animarPersonajes(t, dt);
    this.#animarParticulas(dt);
    this.#animarJefe(t, dt);
    this.#seguirCamara(dt);
    this.renderer.render(this.scene, this.camera);
  }

  #mover(dt) {
    let dx = 0, dz = 0;
    const k = this.teclas;
    if (k.has("arrowup") || k.has("w")) dz -= 1;
    if (k.has("arrowdown") || k.has("s")) dz += 1;
    if (k.has("arrowleft") || k.has("a")) dx -= 1;
    if (k.has("arrowright") || k.has("d")) dx += 1;
    dx += this.joystick.x;
    dz += this.joystick.y;
    if (dx || dz) this.destino = null;
    if (!dx && !dz && this.destino) {
      const v = this.destino.clone().sub(this.jugador.position);
      v.y = 0;
      if (v.length() < 0.2) this.destino = null;
      else { dx = v.x; dz = v.z; }
    }
    const largo = Math.hypot(dx, dz);
    const pos = this.jugador.position;
    if (largo > 0.01) {
      const vel = this.tieneEfecto("velocidad") ? 10 : 6;
      pos.x += (dx / largo) * vel * dt * Math.min(1, largo);
      pos.z += (dz / largo) * vel * dt * Math.min(1, largo);
      const dist = Math.hypot(pos.x, pos.z);
      if (dist > this.limite) { pos.x *= this.limite / dist; pos.z *= this.limite / dist; }
      this.jugador.rotation.y = Math.atan2(dx, dz);
      if (this.tieneEfecto("estela") && Math.random() < 0.6) this.#chispas(pos, 1, 0x7cf03c);
    }
    // Salto (barra espaciadora o botón): las botas antigravedad lo hacen mucho más alto.
    if (this.teclas.has(" ")) this.saltar();
    this.velVertical = (this.velVertical ?? 0) - 22 * dt;
    this.altura = Math.max(0, (this.altura ?? 0) + this.velVertical * dt);
    if (this.altura === 0) this.velVertical = 0;
    const paso = largo > 0.01 && this.altura === 0 ? Math.abs(Math.sin(this.reloj.elapsedTime * 12)) * 0.08 : 0;
    this.jugador.position.y = this.altura + paso;
    const escala = this.reloj.elapsedTime < (this.encogidoHasta ?? 0) ? 0.5 : 1;
    this.jugador.scale.setScalar(this.jugador.scale.x + (escala - this.jugador.scale.x) * Math.min(1, dt * 6));

    // Morty sigue al jugador
    const atras = new THREE.Vector3(1.1, 0, -0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.jugador.rotation.y);
    const meta = pos.clone().add(atras);
    this.morty.position.lerp(new THREE.Vector3(meta.x, Math.sin(this.reloj.elapsedTime * 3) * 0.05, meta.z), Math.min(1, dt * 4));

    // ¿Atrapó un orbe o una letra?
    for (const r of this.respuestas) {
      if (r.quitado) continue;
      const alcance = this.tieneEfecto("estela") ? 1.6 : 0.95;
      const dentro = Math.hypot(r.objeto.position.x - pos.x, r.objeto.position.z - pos.z) < alcance;
      if (dentro && !r.dentro) { this.destino = null; r.alTocar(r.clave); }
      r.dentro = dentro;
    }

    // ¿Entró a un portal o cristal?
    const hayReto = this.respuestas.some(r => !r.quitado);
    for (const d of this.disparadores) {
      if (d.charco && hayReto) { d.dentro = false; continue; }   // durante un reto los charcos no molestan
      const dentro = Math.hypot(d.x - pos.x, d.z - pos.z) < d.radio;
      if (dentro && !d.dentro) { this.destino = null; d.alTocar(); }
      d.dentro = dentro;
    }
  }

  #seguirCamara(dt) {
    const p = this.jugador.position;
    const meta = new THREE.Vector3(p.x, 7.5, p.z + 10);
    this.camera.position.lerp(meta, Math.min(1, dt * 3 + 0.02));
    this.camera.lookAt(p.x, 1, p.z - 2);
  }

  #ajustar() {
    const w = this.renderer.domElement.clientWidth || window.innerWidth;
    const h = this.renderer.domElement.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < 600 ? 68 : 55;
    this.camera.updateProjectionMatrix();
  }
}
