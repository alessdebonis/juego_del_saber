// Administrador: hereda de Usuario. Hace el CRUD de dimensiones, niveles y retos (dependencia «administra»).
import { Usuario } from "./Usuario.js";
import { Dimension } from "./Dimension.js";
import { Nivel } from "./Nivel.js";
import { Reto } from "./Reto.js";

export class Administrador extends Usuario {
  constructor(id, nombre, correo, contrasena, rol = "contenido") {
    super(id, nombre, correo, contrasena);
    this.rol = rol;
  }

  // accion: "crear" | "editar" | "eliminar"
  administrarDimension(dimensiones, accion, datos = {}, indice = -1) {
    if (accion === "crear") dimensiones.push(new Dimension(datos.nombre, datos.materia, datos.desbloqueada ?? true, []));
    if (accion === "editar") Object.assign(dimensiones[indice], datos);
    if (accion === "eliminar") dimensiones.splice(indice, 1);
    return dimensiones;
  }

  administrarNivel(dimension, accion, datos = {}, indice = -1) {
    if (accion === "crear") dimension.niveles.push(new Nivel(dimension.niveles.length + 1, datos.dificultad ?? "fácil", [], datos.invento ?? null));
    if (accion === "editar") Object.assign(dimension.niveles[indice], datos);
    if (accion === "eliminar") {
      dimension.niveles.splice(indice, 1);
      dimension.niveles.forEach((n, i) => { n.numero = i + 1; });
    }
    return dimension.niveles;
  }

  administrarReto(nivel, accion, datos = {}, indice = -1) {
    if (accion === "crear") nivel.retos.push(new Reto(datos.pregunta, datos.opciones, datos.respuestaCorrecta, datos.pista, datos.fuente));
    if (accion === "editar") Object.assign(nivel.retos[indice], datos);
    if (accion === "eliminar") nivel.retos.splice(indice, 1);
    return nivel.retos;
  }
}
