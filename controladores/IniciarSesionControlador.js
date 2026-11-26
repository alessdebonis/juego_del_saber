import { Jugador } from "../modelo/index.js";
import { crearLogros } from "../datos/contenido.js";
import { edadValida } from "../servicios/instrucciones.js";

// Caso de uso: Iniciar sesión (Jugador y Admin).
export class IniciarSesionControlador {
  constructor(ctx) { this.ctx = ctx; }

  // Quien juega entra con su nombre y su edad (de 3 a 99 años). Si ya jugó antes con ese nombre, recupera su progreso.
  ejecutar(nombre, edad) {
    const { almacen, dimensiones } = this.ctx;
    const edadFinal = edadValida(edad);
    const guardado = almacen.cargarJugador(dimensiones);
    let jugador = guardado && guardado.nombre.toLowerCase() === nombre.toLowerCase() ? guardado : null;
    if (!jugador) {
      jugador = new Jugador(`j-${Date.now()}`, nombre, edadFinal);
      jugador.progreso.logros = crearLogros();
    }
    jugador.edad = edadFinal;   // si vuelve con otra edad (por ejemplo, cumplió años), se usa la nueva
    // Si el juego trae logros nuevos, se agregan a los que el jugador ya tenía.
    for (const logro of crearLogros()) {
      if (!jugador.progreso.logros.some(l => l.nombre === logro.nombre)) jugador.progreso.logros.push(logro);
    }
    jugador.progreso.alGuardar = () => almacen.guardarJugador(jugador);
    jugador.iniciarSesion();
    this.ctx.jugador = jugador;
    if (!this.ctx.tutor.jugadores.includes(jugador)) this.ctx.tutor.jugadores.push(jugador);
    this.ctx.c.completarMisionDiaria.asegurarMisionDeHoy();
    return jugador;
  }

  ejecutarAdmin(contrasena) {
    return this.ctx.administrador.iniciarSesion(contrasena);
  }
}
