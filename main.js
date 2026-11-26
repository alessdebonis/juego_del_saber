// Arranque del juego: crea el Modelo, los Controladores y la Vista, y los conecta (MVC).
import { Administrador, Tutor } from "./modelo/index.js";
import { asegurarJefes, crearDimensiones, crearPersonajes } from "./datos/contenido.js";
import { Almacen } from "./persistencia/Almacen.js";
import { crearControladores } from "./controladores/index.js";
import { Vista } from "./vista/Vista.js";
import { RickIA } from "./servicios/RickIA.js";

const ctx = {
  almacen: Almacen,
  dimensiones: asegurarJefes(Almacen.cargarContenido() ?? crearDimensiones()),
  personajes: crearPersonajes(),
  administrador: new Administrador("admin-1", "Administrador", "contacto@portaldelsaber.app", "rick123", "contenido"),
  tutor: Almacen.cargarTutor(),
  jugador: null,
  ia: new RickIA(),
};

crearControladores(ctx);
ctx.vista = new Vista(ctx);
ctx.ia.suscribir(estado => ctx.vista.estadoIA(estado));   // patrón Observer (ver RickIA.js)
ctx.vista.irAlInicio();

// Al cerrar o recargar la página se guarda lo último (por ejemplo, la energía de un invento usado).
window.addEventListener("pagehide", () => ctx.c.guardarProgreso.ejecutar());

// Para revisar el modelo desde la consola del navegador: window.juego
window.juego = ctx;
