// Reglas para otorgar logros. Las usan varios controladores.
const tieneInventoDeCadaDimension = (jugador, dimensiones) =>
  dimensiones.length > 0 && dimensiones.every(d => d.niveles.some(n => n.invento && jugador.inventos.some(i => i.nombre === n.invento.nombre)));

export function revisarLogros(ctx) {
  const { jugador, dimensiones, c } = ctx;
  const nuevos = [];
  const reglas = {
    "Primer viaje": () => jugador.dimensionActual !== null,
    "Cerebro en marcha": () => jugador.progreso.retosCompletados >= 5,
    "Racha imparable": () => (c.responderReto?.mejorRacha ?? 0) >= 5,
    "Aprendí del error": () => (c.jugarNivel?.repasosResueltos ?? 0) >= 1,
    "Coleccionista": () => jugador.inventos.length >= 3,
    "Viajero de dimensiones": () => tieneInventoDeCadaDimension(jugador, dimensiones),
    "Cazador de guardianes": () => dimensiones.some(d => d.niveles.some(n => n.dificultad === "jefe" && n.invento && jugador.inventos.some(i => i.nombre === n.invento.nombre))),
  };
  for (const logro of jugador.progreso.logros) {
    if (!logro.fecha && reglas[logro.nombre]?.()) {
      logro.otorgar();
      nuevos.push(logro);
    }
  }
  return nuevos;
}
