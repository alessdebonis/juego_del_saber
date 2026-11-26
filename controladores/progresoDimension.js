// Cuánto ha avanzado el jugador en cada dimensión. Un nivel está completo si ya ganó su invento.
const tiene = (jugador, invento) => !!invento && jugador.inventos.some(i => i.nombre === invento.nombre);

export function estadoDimension(jugador, d) {
  const normales = d.niveles.filter(n => n.dificultad !== "jefe");
  const jefe = d.niveles.find(n => n.dificultad === "jefe") ?? null;
  const completados = normales.filter(n => tiene(jugador, n.invento)).map(n => n.numero);
  return {
    nombre: d.nombre,
    materia: d.materia,
    abierta: d.desbloqueada,
    niveles: normales.map(n => ({ numero: n.numero, completo: completados.includes(n.numero) })),
    completados: completados.length,
    total: normales.length,
    jefeDespierto: !!jefe && normales.length > 0 && completados.length === normales.length,
    jefeVencido: !!jefe && tiene(jugador, jefe.invento),
  };
}
