// Caso de uso: Administrar (CRUD) retos — actor Admin.
// accion: "crear" | "editar" | "eliminar"
export class AdministrarRetosControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(nivel, accion, datos = {}, indice = -1) {
    const { administrador, almacen, dimensiones, vista } = this.ctx;
    if (!administrador.sesionActiva) return null;
    const resultado = administrador.administrarReto(nivel, accion, datos, indice);
    almacen.guardarContenido(dimensiones);
    vista.refrescarPortales();
    return resultado;
  }
}
