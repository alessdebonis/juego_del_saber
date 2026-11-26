// Caso de uso: Administrar (CRUD) niveles — actor Admin.
// accion: "crear" | "editar" | "eliminar"
export class AdministrarNivelesControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(dimension, accion, datos = {}, indice = -1) {
    const { administrador, almacen, dimensiones, vista } = this.ctx;
    if (!administrador.sesionActiva) return null;
    const resultado = administrador.administrarNivel(dimension, accion, datos, indice);
    almacen.guardarContenido(dimensiones);
    vista.refrescarPortales();
    return resultado;
  }
}
