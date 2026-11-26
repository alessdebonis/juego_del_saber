// Caso de uso: Configurar opciones (sonido, voz, modo demo y datos del tutor).
export class ConfigurarOpcionesControlador {
  constructor(ctx) { this.ctx = ctx; }

  ejecutar(cambios, datosTutor = null) {
    const { jugador, tutor, almacen, c } = this.ctx;
    const opciones = jugador.configurarOpciones(cambios);
    if (datosTutor) {
      Object.assign(tutor, datosTutor);
      almacen.guardarTutor(tutor);
    }
    c.guardarProgreso.ejecutar();
    return opciones;
  }
}
