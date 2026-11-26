// Reto: una pregunta de opción múltiple. respuestaCorrecta es la letra de la opción: "A", "B" o "C".
// fuente: en los mundos creados desde material, la frase exacta del material del profe donde está
// la respuesta. Así Rick explica con el texto del profe y no con algo inventado.
export class Reto {
  constructor(pregunta, opciones, respuestaCorrecta, pista, fuente = "") {
    this.pregunta = pregunta;
    this.opciones = [...opciones];
    this.respuestaCorrecta = respuestaCorrecta;
    this.pista = pista;
    this.fuente = fuente;
  }

  verificarRespuesta(r) {
    return r === this.respuestaCorrecta;
  }

  darPista() {
    return this.pista;
  }
}
