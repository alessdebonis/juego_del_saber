// ===================== INTERFAZ: CasoDeUso =====================
// Concepto del curso: INTERFAZ.
// JavaScript no tiene la palabra "interface" como Java, así que la simulamos:
// una interfaz es un CONTRATO que dice qué métodos debe tener una clase, sin decir cómo se hacen.
//
// ¿Para qué? Todas las clases control (una por caso de uso) deben poder ejecutarse
// de la misma forma: con ejecutar(). Así la vista no necesita saber cuál controlador es;
// solo sabe que "cumple el contrato CasoDeUso".
//
// ¿Por qué no una clase abstracta? Porque los controladores no comparten atributos
// ni código: solo comparten la obligación de tener ejecutar(). Eso es una interfaz.
// (La clase abstracta del proyecto es Usuario, que sí comparte atributos y métodos.)

export const CasoDeUso = Object.freeze({
  nombre: "CasoDeUso",
  metodos: ["ejecutar"],   // en Java sería: interface CasoDeUso { Object ejecutar(...); }
});

// Revisa que un objeto cumpla una interfaz (como "implements" en Java).
// Si le falta un método, el juego avisa al arrancar en vez de fallar a mitad de partida.
export function implementa(objeto, interfaz) {
  for (const metodo of interfaz.metodos) {
    if (typeof objeto[metodo] !== "function") {
      throw new Error(`${objeto.constructor.name} no implementa ${interfaz.nombre}: le falta ${metodo}()`);
    }
  }
  return true;
}
