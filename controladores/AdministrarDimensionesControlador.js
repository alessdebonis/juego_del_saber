import { ExportadorMultiverso } from "../persistencia/ExportadorMultiverso.js";
import { asegurarJefes } from "../datos/contenido.js";

// Caso de uso: Administrar (CRUD) dimensiones — actor Admin.
// accion: "crear" | "editar" | "eliminar"
// Lo extiende «Crear dimensión desde material» (CrearDimensionDesdeMaterialControlador).
export class AdministrarDimensionesControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(lista, accion, datos = {}, indice = -1) {
    const { administrador, almacen, dimensiones, vista } = this.ctx;
    if (!administrador.sesionActiva) return null;
    const resultado = administrador.administrarDimension(lista, accion, datos, indice);
    almacen.guardarContenido(dimensiones);
    vista.refrescarPortales();
    return resultado;
  }

  // Deja las dimensiones listas para el Motor del Multiverso: descarga un .json
  // con su formato. No se envía a ninguna web.
  exportar() {
    const { administrador, dimensiones } = this.ctx;
    if (!administrador.sesionActiva) return null;
    return ExportadorMultiverso.descargar(dimensiones);
  }

  // Compartir un mundo con otro computador: descarga esa dimensión como archivo .json.
  exportarMundo(indice) {
    const { administrador, almacen, dimensiones } = this.ctx;
    const d = dimensiones[indice];
    if (!administrador.sesionActiva || !d) return null;
    const contenido = almacen.mundoATexto(d);
    const archivo = d.nombre.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
    almacen.descargarArchivo(contenido, `${archivo || "mundo"}.mundo.json`);
    return contenido;
  }

  // Agrega un mundo que viene en un archivo exportado desde otro computador.
  importarMundo(contenido) {
    const { administrador, almacen, dimensiones, vista } = this.ctx;
    if (!administrador.sesionActiva) throw new Error("Inicia sesión como administrador.");
    const dimension = almacen.leerMundo(contenido);
    if (dimensiones.some(d => d.nombre === dimension.nombre)) {
      throw new Error(`Ya hay un mundo llamado «${dimension.nombre}». Bórralo o cámbiale el nombre antes de importar.`);
    }
    asegurarJefes([dimension]);
    dimensiones.push(dimension);
    almacen.guardarContenido(dimensiones);
    vista.refrescarPortales();
    return dimension;
  }
}
