// Contenido inicial del juego: dimensiones, niveles, retos, inventos y logros.
// El Administrador puede cambiar todo esto desde el panel de administración (CRUD).
import { Dimension, Invento, Logro, Nivel, Personaje } from "../modelo/index.js";

const r = (pregunta, opciones, respuestaCorrecta, pista) => ({ pregunta, opciones, respuestaCorrecta, pista });

export const INVENTOS = {
  lupa: new Invento("Lupa de letras", "Lee el reto en voz alta.", "leer"),
  libro: new Invento("Libro saltarín", "Quita una opción incorrecta.", "quitar"),
  traductor: new Invento("Traductor universal", "Lee el reto en voz alta.", "leer"),
  calculadora: new Invento("Calculadora cuántica", "Quita una opción incorrecta.", "quitar"),
  rayo: new Invento("Rayo encogedor", "Encoge una opción incorrecta hasta desaparecerla.", "quitar"),
  reloj: new Invento("Reloj de neutrinos", "Recarga 20 de energía del portal.", "energia"),
  lapiz: new Invento("Lápiz antigravedad", "Quita una opción incorrecta.", "quitar"),
  borrador: new Invento("Borrador de dimensiones", "Recarga 20 de energía del portal.", "energia"),
  casco: new Invento("Casco de ideas", "Lee el reto en voz alta.", "leer"),
  // Legendarios: se ganan venciendo al guardián de cada dimensión y cambian el mundo.
  botas: new Invento("Botas antigravedad", "Saltas tres veces más alto (barra espaciadora).", "saltar"),
  propulsor: new Invento("Propulsor de neutrinos", "Corres mucho más rápido.", "velocidad"),
  estela: new Invento("Estela de portal", "Dejas un rastro de luz y atrapas respuestas desde más lejos.", "estela"),
};

// Efectos de inventos que cambian el mundo (se encienden y apagan cuando el jugador quiera).
export const EFECTOS_MUNDO = ["saltar", "velocidad", "estela"];

const JEFES = { lectura: "botas", matematicas: "propulsor", escritura: "estela" };

// Cada dimensión tiene un nivel 4: el guardián. Si el contenido guardado es viejo, se lo agrega.
export function asegurarJefes(dimensiones) {
  for (const d of dimensiones) {
    if (!d.niveles.some(n => n.dificultad === "jefe")) {
      d.niveles.push(new Nivel(4, "jefe", [], INVENTOS[JEFES[d.materia] ?? "botas"]));
    }
  }
  return dimensiones;
}

// Inventos de un mundo creado desde el material del profe. Llevan el tema en el nombre para que
// sean únicos: así ganar los de otra dimensión no marca como completos los niveles de este mundo.
export function inventosDeMundo(tema) {
  return [
    new Invento(`Lupa del saber (${tema})`, "Lee el reto en voz alta.", "leer"),
    new Invento(`Rayo de ideas (${tema})`, "Quita una opción incorrecta.", "quitar"),
    new Invento(`Batería del saber (${tema})`, "Recarga 20 de energía del portal.", "energia"),
    new Invento(`Corona antigravedad (${tema})`, "Invento legendario: saltas tres veces más alto (barra espaciadora).", "saltar"),
  ];
}

export function crearDimensiones() {
  return [
    new Dimension("Dimensión de las Letras", "lectura", true, [
      { numero: 1, dificultad: "fácil", invento: INVENTOS.lupa, retos: [
        r("Lee: «El gato toma leche.» ¿Qué toma el gato?", ["Agua", "Leche", "Jugo"], "B", "Busca la palabra que va después de «toma»."),
        r("Lee: «Morty tiene un globo rojo.» ¿De qué color es el globo?", ["Azul", "Verde", "Rojo"], "C", "El color está al final de la frase."),
        r("¿Cuál palabra empieza con la letra M?", ["Mesa", "Sapo", "Luna"], "A", "Di cada palabra despacio: mmm…"),
      ]},
      { numero: 2, dificultad: "medio", invento: INVENTOS.libro, retos: [
        r("Lee: «Rick cruza un portal verde y llega a un planeta de dulces.» ¿A dónde llega Rick?", ["A un río", "A un planeta de dulces", "A su casa"], "B", "Busca qué hay después de «llega a»."),
        r("Lee: «La nave tiene tres ventanas.» ¿Cuántas ventanas tiene la nave?", ["Dos", "Cinco", "Tres"], "C", "El número está antes de la palabra «ventanas»."),
        r("¿Qué palabra rima con «ratón»?", ["Camión", "Perro", "Mesa"], "A", "Fíjate cómo suena el final: -ón."),
      ]},
      { numero: 3, dificultad: "difícil", invento: INVENTOS.traductor, retos: [
        r("Lee: «Morty olvidó su mochila, así que volvió al garaje.» ¿Por qué volvió Morty?", ["Tenía hambre", "Olvidó su mochila", "Estaba lloviendo"], "B", "La razón está antes de «así que»."),
        r("Lee: «El robot estaba feliz porque arregló la nave.» ¿Cómo se sentía el robot?", ["Triste", "Enojado", "Feliz"], "C", "Busca la palabra que dice cómo estaba."),
        r("¿Cuál oración tiene sentido?", ["El sol sale de noche.", "Los peces nadan en el agua.", "La silla come pan."], "B", "Piensa: ¿cuál puede pasar de verdad?"),
      ]},
    ]),
    new Dimension("Dimensión de los Números", "matematicas", true, [
      { numero: 1, dificultad: "fácil", invento: INVENTOS.calculadora, retos: [
        r("Rick tiene 2 cristales y encuentra 1 más. ¿Cuántos tiene ahora?", ["2", "3", "4"], "B", "Cuenta 2 y luego uno más con tus dedos."),
        r("¿Cuánto es 4 + 1?", ["3", "5", "6"], "B", "Empieza en 4 y avanza un paso."),
        r("Morty tenía 5 galletas y se comió 2. ¿Cuántas le quedan?", ["3", "2", "7"], "A", "Quitar es restar: 5 menos 2."),
      ]},
      { numero: 2, dificultad: "medio", invento: INVENTOS.rayo, retos: [
        r("¿Cuánto es 7 + 5?", ["11", "12", "13"], "B", "7 + 3 es 10. Te faltan 2 más."),
        r("¿Cuánto es 10 − 4?", ["6", "5", "14"], "A", "Cuenta hacia atrás desde 10, cuatro pasos."),
        r("Hay 3 portales y cada uno tiene 2 luces. ¿Cuántas luces hay?", ["5", "8", "6"], "C", "Suma 2 tres veces: 2 + 2 + 2."),
      ]},
      { numero: 3, dificultad: "difícil", invento: INVENTOS.reloj, retos: [
        r("¿Cuánto es 6 × 3?", ["18", "9", "16"], "A", "Es sumar 6 tres veces."),
        r("Rick reparte 12 baterías entre 3 robots por igual. ¿Cuántas recibe cada uno?", ["3", "4", "6"], "B", "¿Qué número por 3 da 12?"),
        r("¿Qué número sigue? 5, 10, 15, …", ["16", "25", "20"], "C", "Cada número sube de 5 en 5."),
      ]},
    ]),
    new Dimension("Dimensión de las Palabras", "escritura", false, [
      { numero: 1, dificultad: "fácil", invento: INVENTOS.lapiz, retos: [
        r("¿Qué letra falta?  C _ S A", ["O", "A", "E"], "B", "Es donde vives con tu familia."),
        r("¿Qué letra falta?  P _ R R O", ["E", "A", "U"], "A", "Es un animal que dice «guau»."),
        r("¿Qué letra falta?  L U _ A", ["M", "N", "S"], "B", "Sale en el cielo de noche."),
      ]},
      { numero: 2, dificultad: "medio", invento: INVENTOS.borrador, retos: [
        r("¿Cuál está bien escrita?", ["Árbol", "Arvol", "Harbol"], "A", "Árbol se escribe con «b» de burro."),
        r("¿Cuál está bien escrita?", ["Baca", "Vaca", "Vaka"], "B", "El animal que da leche va con «v»."),
        r("Ordena las palabras: SOL · EL · BRILLA", ["Brilla sol el.", "Sol el brilla.", "El sol brilla."], "C", "Empieza con «El»."),
      ]},
      { numero: 3, dificultad: "difícil", invento: INVENTOS.casco, retos: [
        r("¿Qué palabra completa la oración?  «Morty ___ un dibujo.»", ["hizo", "izo", "hiso"], "A", "Lleva una letra muda al inicio."),
        r("¿Dónde están bien las mayúsculas?", ["rick y morty viajan.", "Rick y Morty viajan.", "rick y Morty viajan."], "B", "Los nombres y el inicio van con mayúscula."),
        r("¿Qué signo va al final?  «¿Dónde está el portal_»", [".", "?", "!"], "B", "Si empieza con «¿», termina con…"),
      ]},
    ]),
  ];
}

export function crearLogros() {
  return [
    new Logro("Primer viaje", "Cruzaste tu primer portal."),
    new Logro("Cerebro en marcha", "Resolviste 5 retos."),
    new Logro("Racha imparable", "Acertaste 5 veces seguidas."),
    new Logro("Aprendí del error", "Resolviste bien un reto que habías fallado."),
    new Logro("Coleccionista", "Juntaste 3 inventos."),
    new Logro("Viajero de dimensiones", "Ganaste un invento en cada dimensión."),
    new Logro("Cazador de guardianes", "Venciste a tu primer guardián de dimensión."),
  ];
}

export function crearPersonajes() {
  return [
    new Personaje("Explorador", "explorador"),
    new Personaje("Científica", "cientifica"),
    new Personaje("Robot", "robot"),
  ];
}

export const ACCESORIOS = ["gafas", "gorro", "mochila"];

export const DIALOGOS = {
  bienvenida: n => `¡Bienvenido a mi garaje, ${n}! Cada portal lleva a una dimensión. Camina hasta uno.`,
  dimension: d => `Estás en la ${d}. Toca un cristal para empezar: 1 es fácil, 3 es difícil. ¡Corre hacia la respuesta correcta!`,
  bloqueada: e => `Esa dimensión necesita 30 de energía. Tienes ${e}. Resuelve retos para recargar el portal.`,
  desbloqueada: d => `¡La ${d} está abierta! Tu portal tenía energía suficiente.`,
  correcto: ["¡Eso! Tu cerebro acaba de subir de nivel.", "Correcto. Casi tan rápido como yo.", "¡Bien hecho! El portal se recarga.", "¡Exacto! Eres un genio en entrenamiento."],
  incorrecto: ["Casi. Mira otra vez, tú puedes.", "Mmm, no es esa. Intenta de nuevo.", "Ups. Los genios también se equivocan. Otra vez."],
  morty: ["Morty: ¡Uy! Yo iba a escoger otra…", "Morty: ¡Vamos, tú puedes!", "Morty: Ojalá yo supiera tanto."],
  nivelCompleto: i => `¡Nivel completo! Ganaste un invento: ${i}.`,
  pista: p => `Pista: ${p}`,
  jefeBloqueado: "El guardián duerme. Gana los inventos de los niveles 1, 2 y 3 para despertarlo.",
  jefeAparece: "¡Un guardián de dimensión! Cada respuesta correcta le baja vida. ¡Tú puedes!",
  jefeGolpe: ["¡Toma eso, guardián!", "¡Le diste! Ya casi.", "¡Otro golpe de cerebro!"],
  jefeRie: "El guardián se ríe… ¡pero no te rindas! Mira la pista.",
  jefeVencido: i => `¡Venciste al guardián! Ganaste un invento legendario: ${i}.`,
  charco: (c, e) => `¡Puaj! Fluido de portal. Te saqué de ahí, pero perdiste ${c} de energía (te quedan ${e}).`,
};

// Reglas de cada dimensión (como el panel de reglas del Motor del Multiverso).
// Se muestran al entrar y con el botón REGLAS. No son una clase: son solo texto.
const REGLA_MATERIA = {
  lectura: "Lee el reto con calma y corre hacia la respuesta correcta.",
  matematicas: "Cuenta las gemas antes de responder: los números se pueden ver.",
  escritura: "Para armar una palabra, atrapa las letras en orden.",
  material: "Las preguntas salen del material de tu profe. Lee con calma: toca una palabra para oírla.",
};
export function reglasDimension(dimension) {
  return [
    "Cada cristal es un nivel. Camina hasta él para empezar.",
    REGLA_MATERIA[dimension.materia] ?? REGLA_MATERIA.lectura,
    "Respuesta correcta: +10 de energía para el portal. Fallar no quita nada: Rick te da una pista.",
    "¡Cuidado con los charcos verdes de fluido de portal! Te empujan afuera y cuestan 5 de energía.",
    "Gana los niveles 1, 2 y 3 para despertar al guardián.",
    "El portal GARAJE te lleva de vuelta con Rick.",
  ];
}
export const CHARCO_COSTO = 5;
