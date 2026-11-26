import { DIALOGOS } from "../datos/contenido.js";

// Caso de uso: Desbloquear dimensión «extend» Viajar por portal.
// Se abre cuando el portal tiene 30 de energía (o en modo demo).
export class DesbloquearDimensionControlador {
  static ENERGIA_NECESARIA = 30;

  constructor(ctx) { this.ctx = ctx; }

  ejecutar(dimension) {
    const { jugador, vista, almacen, dimensiones } = this.ctx;
    const puede = jugador.opciones.modoDemo || jugador.portal.energia >= DesbloquearDimensionControlador.ENERGIA_NECESARIA;
    if (!puede) {
      vista.decir(DIALOGOS.bloqueada(jugador.portal.energia));
      vista.sonido("error");
      return false;
    }
    dimension.desbloquear();
    almacen.guardarContenido(dimensiones);
    vista.decir(DIALOGOS.desbloqueada(dimension.nombre));
    vista.refrescarPortales();
    return true;
  }
}
