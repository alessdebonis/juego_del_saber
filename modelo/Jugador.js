// Jugador: hereda de Usuario. Es el niño que juega.
// Composición: Portal y Progreso nacen con el jugador.
// Agregación: los Inventos existen aparte; el jugador solo los colecciona.
import { Usuario } from "./Usuario.js";
import { Portal } from "./Portal.js";
import { Progreso } from "./Progreso.js";

export class Jugador extends Usuario {
  constructor(id, nombre, edad = 0) {
    super(id, nombre);           // sin correo ni contraseña: es un niño
    this.edad = edad;
    this.personaje = null;        // Jugador "1" -- "1" Personaje : usa
    this.portal = new Portal();   // composición
    this.progreso = new Progreso(); // composición
    this.inventos = [];           // agregación 0..*
    this.dimensionActual = null;
    this.nivelActual = null;
    this.explorando = false;
    this.pausado = false;
    this.opciones = { sonido: true, voz: true, modoDemo: false };
  }

  elegirPersonaje(p) {
    this.personaje = p;
  }

  viajarPorPortal(d) {
    if (!this.portal.abrir(d)) return false;
    this.dimensionActual = d;
    return true;
  }

  elegirNivel(n) {
    this.nivelActual = n;
    this.progreso.nivelActual = n.numero;
  }

  jugarNivel() {
    if (!this.nivelActual) return null;
    this.nivelActual.iniciar();
    return this.nivelActual.retoActual();
  }

  explorarDimension() {
    this.explorando = true;
  }

  // Devuelve el nivel que guarda el objeto tocado (los cristales de cada dimensión).
  interactuarConObjeto(numeroNivel) {
    return this.dimensionActual?.niveles.find(n => n.numero === numeroNivel) ?? null;
  }

  usarInvento(i) {
    if (!this.inventos.includes(i)) return null;
    return i.usar();
  }

  pausarPartida() {
    this.pausado = !this.pausado;
    return this.pausado;
  }

  configurarOpciones(cambios = {}) {
    Object.assign(this.opciones, cambios);
    return this.opciones;
  }
}
