// Portal: pertenece al jugador (composición). Su energía se recarga con cada reto correcto.
export class Portal {
  static ENERGIA_MAXIMA = 100;

  constructor(energia = 0) {
    this.energia = energia;
  }

  recargar(cantidad) {
    this.energia = Math.min(Portal.ENERGIA_MAXIMA, this.energia + cantidad);
  }

  // Solo abre si la dimensión está desbloqueada.
  abrir(d) {
    return d.desbloqueada;
  }
}
