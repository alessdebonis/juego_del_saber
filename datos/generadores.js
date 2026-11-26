// Generadores de retos: crean retos nuevos cada vez, según la materia y la dificultad (1 a 5).
// Así el niño no memoriza las respuestas: tiene que pensar.
// Cada generador devuelve una lista de Reto (una palabra para armar son varios retos, uno por letra).
import { Reto } from "../modelo/index.js";

const LETRAS = ["A", "B", "C"];
const azar = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const elegir = lista => lista[Math.floor(Math.random() * lista.length)];
const barajar = lista => {
  const l = [...lista];
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l;
};
// Primera letra en mayúscula: los nombres como «el robot» pueden quedar al inicio de la oración.
const mayuscula = s => s[0].toUpperCase() + s.slice(1);

// Arma un reto de opción múltiple con la respuesta en una posición al azar.
function opcionMultiple(pregunta, correcta, distractores, pista) {
  const unicos = [...new Set(distractores.map(String))].filter(d => d !== String(correcta)).slice(0, 2);
  const opciones = barajar([String(correcta), ...unicos]);
  return new Reto(pregunta, opciones, LETRAS[opciones.indexOf(String(correcta))], pista);
}

// ---------------- Matemáticas ----------------
const NOMBRES = ["Rick", "Morty", "Summer", "el robot"];
const COSAS = [["cristales", "Cuántos"], ["baterías", "Cuántas"], ["galletas", "Cuántas"], ["tornillos", "Cuántos"], ["estrellas", "Cuántas"]];

function cercanos(n) {
  return barajar([n + 1, n - 1, n + 2, n - 2, n >= 10 ? n + 10 : n + 3].filter(x => x >= 0 && x !== n));
}

function matematicas(d) {
  if (d <= 1) {
    const a = azar(1, 4), b = azar(1, 4);
    return [opcionMultiple(`¿Cuánto es ${a} + ${b}?`, a + b, cercanos(a + b),
      `Cuenta los cristales: primero ${a}, luego ${b} más.`)];
  }
  if (d === 2) {
    if (Math.random() < 0.5) {
      const a = azar(3, 9), b = azar(1, a - 1);
      return [opcionMultiple(`¿Cuánto es ${a} − ${b}?`, a - b, [...cercanos(a - b), a + b],
        `Empieza en ${a} y cuenta hacia atrás ${b} pasos.`)];
    }
    const a = azar(2, 6), b = azar(2, 5), quien = elegir(NOMBRES), [cosa, cuantos] = elegir(COSAS);
    return [opcionMultiple(`${mayuscula(quien)} tiene ${a} ${cosa} y encuentra ${b} más. ¿${cuantos} tiene ahora? (${a} + ${b})`, a + b, cercanos(a + b),
      `Juntar es sumar: empieza en ${a} y avanza ${b}.`)];
  }
  if (d === 3) {
    if (Math.random() < 0.5) {
      const a = azar(6, 12), b = azar(3, 8);
      return [opcionMultiple(`¿Cuánto es ${a} + ${b}?`, a + b, cercanos(a + b),
        `Completa la decena: ${a} + ${10 - (a % 10 || 10)} llega a ${a + (10 - (a % 10 || 10))}, y luego suma lo que falta.`)];
    }
    const a = azar(10, 18), b = azar(2, 9), quien = elegir(NOMBRES), [cosa, cuantos] = elegir(COSAS);
    return [opcionMultiple(`${mayuscula(quien)} tenía ${a} ${cosa} y regaló ${b}. ¿${cuantos} le quedan? (${a} − ${b})`, a - b, [...cercanos(a - b), a + b],
      `Regalar es restar: a ${a} quítale ${b}.`)];
  }
  if (d === 4) {
    if (Math.random() < 0.5) {
      const t = elegir([2, 3, 5, 10]), n = azar(2, 6);
      return [opcionMultiple(`¿Cuánto es ${t} × ${n}?`, t * n, [...cercanos(t * n), t + n],
        `Multiplicar es sumar ${t} varias veces: ${Array(n).fill(t).join(" + ")}.`)];
    }
    const a = azar(2, 9), total = a + azar(2, 9);
    return [opcionMultiple(`¿Qué número falta?  ${a} + ? = ${total}`, total - a, [...cercanos(total - a), total + a],
      `Piensa: ¿cuánto le falta a ${a} para llegar a ${total}? Cuenta desde ${a}.`)];
  }
  // d >= 5
  const tipo = azar(1, 3);
  if (tipo === 1) {
    const a = azar(3, 9), b = azar(3, 9);
    return [opcionMultiple(`¿Cuánto es ${a} × ${b}?`, a * b, [...cercanos(a * b), a * (b - 1), a + b],
      `Son ${b} grupos de ${a}. Suma ${a} de a poco, ${b} veces.`)];
  }
  if (tipo === 2) {
    const g = azar(2, 5), cada = azar(2, 6), total = g * cada;
    return [opcionMultiple(`Rick reparte ${total} baterías entre ${g} robots por igual. ¿Cuántas recibe cada uno? (${total} ÷ ${g})`, cada, [...cercanos(cada), g],
      `Busca el número que por ${g} da ${total}.`)];
  }
  const inicio = azar(1, 10), salto = elegir([2, 3, 5, 10]);
  const serie = [0, 1, 2, 3].map(i => inicio + salto * i);
  return [opcionMultiple(`¿Qué número sigue?  ${serie.join(", ")}, …`, inicio + salto * 4, cercanos(inicio + salto * 4),
    `Mira cuánto sube cada vez: de ${serie[0]} a ${serie[1]} sube ${salto}.`)];
}

// ---------------- Lectura ----------------
const SILABAS = [
  ["mesa", "me", ["ma", "mo"]], ["luna", "lu", ["la", "le"]], ["sapo", "sa", ["so", "se"]],
  ["pato", "pa", ["po", "pe"]], ["nube", "nu", ["na", "ni"]], ["dedo", "de", ["da", "do"]],
  ["gato", "ga", ["go", "gu"]], ["foca", "fo", ["fa", "fe"]], ["rana", "ra", ["ro", "re"]],
];
const PALABRAS_INICIO = [
  ["M", "Mesa", ["Sapo", "Luna"]], ["S", "Sol", ["Pan", "Té"]], ["P", "Perro", ["Gato", "Oso"]],
  ["L", "Luna", ["Nave", "Dedo"]], ["R", "Robot", ["Mapa", "Casa"]], ["N", "Nave", ["Mano", "Foca"]],
];
const plural = c => (/[aeiou]$/.test(c) ? `${c}s` : `${c}es`);
const COLORES = ["rojo", "azul", "verde", "amarillo", "morado"];
const OBJETOS = [["globo", "globos"], ["cohete", "cohetes"], ["libro", "libros"], ["robot", "robots"]];
const NUMEROS = ["dos", "tres", "cuatro", "cinco"];
const LUGARES = [["al planeta de los dulces", "Al planeta de los dulces", ["Al río", "A la escuela"]],
  ["a la Ciudadela", "A la Ciudadela", ["Al parque", "A la playa"]],
  ["a la dimensión de los números", "A la dimensión de los números", ["A la cocina", "Al bosque"]]];
const CAUSAS = [
  ["olvidó su mochila", "Porque olvidó su mochila", ["Porque tenía hambre", "Porque estaba lloviendo"]],
  ["la nave estaba rota", "Porque la nave estaba rota", ["Porque era de noche", "Porque tenía frío"]],
  ["quería ver a su abuelo", "Porque quería ver a su abuelo", ["Porque perdió un zapato", "Porque estaba aburrido"]],
];

function lectura(d) {
  const quien = elegir(["Morty", "Summer", "Rick"]);
  if (d <= 1) {
    if (Math.random() < 0.5) {
      const [palabra, sil, otras] = elegir(SILABAS);
      return [opcionMultiple(`Lee: «${palabra}». ¿Con qué sílaba empieza?`, sil, otras,
        `Toca la palabra para oírla y escucha el primer sonido: ${palabra[0]}…`)];
    }
    const [letra, bien, mal] = elegir(PALABRAS_INICIO);
    return [opcionMultiple(`¿Cuál palabra empieza con la letra ${letra}?`, bien, mal,
      `Di cada palabra despacio y fíjate en su primer sonido.`)];
  }
  if (d === 2) {
    const [obj, objs] = elegir(OBJETOS), color = elegir(COLORES);
    return [opcionMultiple(`Lee: «${quien} tiene un ${obj} ${color}.» ¿De qué color es el ${obj}?`,
      color[0].toUpperCase() + color.slice(1), barajar(COLORES.filter(c => c !== color)).map(c => c[0].toUpperCase() + c.slice(1)),
      `El color está justo después de «${obj}».`)];
  }
  if (d === 3) {
    const [, objs] = elegir(OBJETOS), color = elegir(COLORES), n = azar(0, NUMEROS.length - 1);
    const numero = NUMEROS[n];
    return [opcionMultiple(`Lee: «${quien} encontró ${numero} ${objs} ${plural(color)} en el garaje.» ¿Cuántos ${objs} encontró?`,
      numero[0].toUpperCase() + numero.slice(1), barajar(NUMEROS.filter(x => x !== numero)).map(x => x[0].toUpperCase() + x.slice(1)),
      `Busca la palabra que dice cuántos: está antes de «${objs}».`)];
  }
  if (d === 4) {
    const [lugar, bien, mal] = elegir(LUGARES);
    return [opcionMultiple(`Lee: «${quien} cruzó un portal verde y viajó ${lugar}. Allí hizo un amigo nuevo.» ¿A dónde viajó ${quien}?`, bien, mal,
      `Busca qué viene después de «viajó».`)];
  }
  const [causa, bien, mal] = elegir(CAUSAS);
  if (Math.random() < 0.5) {
    return [opcionMultiple(`Lee: «${quien} volvió al garaje porque ${causa}.» ¿Por qué volvió?`, bien, mal,
      `La razón viene después de la palabra «porque».`)];
  }
  const primero = elegir(["desayunó", "se puso las botas", "cargó la batería"]);
  const despues = elegir(["cruzó el portal", "salió a explorar", "subió a la nave"]);
  return [opcionMultiple(`Lee: «Primero ${quien} ${primero}. Después ${despues}.» ¿Qué hizo primero?`,
    primero[0].toUpperCase() + primero.slice(1), [despues[0].toUpperCase() + despues.slice(1), "Se fue a dormir"],
    `Busca la palabra «Primero» y lee lo que sigue.`)];
}

// ---------------- Escritura ----------------
const PALABRAS_ARMAR = {
  corta: [["SOL", "☀️"], ["PAN", "🍞"], ["OSO", "🐻"], ["PEZ", "🐟"], ["MAR", "🌊"], ["LUZ", "💡"]],
  media: [["CASA", "🏠"], ["GATO", "🐱"], ["LUNA", "🌙"], ["NAVE", "🚀"], ["PATO", "🦆"], ["MESA", "🪑"], ["FLOR", "🌸"]],
  larga: [["ROBOT", "🤖"], ["LIBRO", "📖"], ["PERRO", "🐶"], ["LECHE", "🥛"], ["PLANETA", "🪐"], ["PORTAL", "🌀"], ["MOCHILA", "🎒"]],
};
const ORTOGRAFIA = [
  ["vaca", ["baca", "vaka"], "El animal que da leche se escribe con «v»."],
  ["burro", ["vurro", "buro"], "Burro va con «b» y con «rr» porque suena fuerte."],
  ["hoja", ["oja", "hoga"], "Hoja lleva una «h» muda al inicio."],
  ["huevo", ["uevo", "huebo"], "Huevo empieza con «hue» y lleva «v»."],
  ["zapato", ["sapato", "zapatto"], "Zapato empieza con «z»."],
  ["cielo", ["sielo", "cyelo"], "Cielo se escribe con «c» antes de la «i»."],
  ["llave", ["yave", "llabe"], "Llave empieza con «ll» y lleva «v»."],
  ["árbol", ["arvol", "harbol"], "Árbol lleva tilde en la «á» y se escribe con «b»."],
];
const MAYUSCULAS = [
  ["Rick y Morty viajan.", ["rick y morty viajan.", "rick y Morty viajan."]],
  ["Summer vive en la Tierra.", ["summer vive en la tierra.", "Summer vive en la tierra."]],
  ["El robot se llama Beto.", ["el robot se llama beto.", "El robot se llama beto."]],
];
const SIGNOS = [
  ["¿Dónde está el portal_", "?", [".", "!"], "Si la oración empieza con «¿», termina con «?»."],
  ["¡Qué nave tan rápida_", "!", ["?", "."], "Si empieza con «¡», termina con «!»."],
  ["Morty come una manzana_", ".", ["?", "!"], "Si cuenta algo y no pregunta ni grita, termina en punto."],
];
const ABECEDARIO = "ABCDEFGHIJLMNOPRSTUV";

// Una palabra para armar = un reto por letra. La respuesta de cada reto es la letra que sigue (un char).
// Las opciones son todas las letras que flotan en el mundo (las de la palabra + unas de más para despistar).
export function armarPalabra(palabra, emoji) {
  const extras = barajar([...ABECEDARIO].filter(l => !palabra.includes(l))).slice(0, palabra.length <= 3 ? 2 : 3);
  const letras = barajar([...palabra, ...extras]);
  return [...palabra].map((letra, i) => new Reto(
    `Arma la palabra ${emoji} «${palabra}»:  ${palabra.slice(0, i)}${"_".repeat(palabra.length - i)}`,
    letras, letra,
    i === 0
      ? `Di «${palabra.toLowerCase()}» despacio. El primer sonido es la «${letra}».`
      : `Di «${palabra.toLowerCase()}» despacio. Después de «${palabra.slice(0, i)}» suena la «${letra}».`,
  ));
}

function escritura(d) {
  if (d <= 1) {
    if (Math.random() < 0.5) {
      const [p, e] = elegir(PALABRAS_ARMAR.media);
      const i = azar(1, p.length - 2);
      return [opcionMultiple(`¿Qué letra falta?  ${e}  ${p.slice(0, i)} _ ${p.slice(i + 1)}`, p[i],
        barajar([...ABECEDARIO].filter(l => l !== p[i])).slice(0, 2), `Di «${p.toLowerCase()}» despacio y escucha cada sonido.`)];
    }
    return armarPalabra(...elegir(PALABRAS_ARMAR.corta));
  }
  if (d === 2) return armarPalabra(...elegir(PALABRAS_ARMAR.media));
  if (d === 3) {
    if (Math.random() < 0.5) {
      const [bien, mal, pista] = elegir(ORTOGRAFIA);
      return [opcionMultiple("¿Cuál está bien escrita?", bien, mal, pista)];
    }
    return armarPalabra(...elegir(PALABRAS_ARMAR.media));
  }
  if (d === 4) {
    if (Math.random() < 0.5) {
      const [bien, mal] = elegir(MAYUSCULAS);
      return [opcionMultiple("¿Dónde están bien las mayúsculas?", bien, mal,
        "Los nombres de personas y el inicio de la oración van con mayúscula.")];
    }
    return armarPalabra(...elegir(PALABRAS_ARMAR.larga));
  }
  const t = azar(1, 3);
  if (t === 1) {
    const [frase, bien, mal, pista] = elegir(SIGNOS);
    return [opcionMultiple(`¿Qué signo va al final?  «${frase}»`, bien, mal, pista)];
  }
  if (t === 2) {
    const [bien, mal, pista] = elegir(ORTOGRAFIA);
    return [opcionMultiple("¿Cuál está bien escrita?", bien, mal, pista)];
  }
  return armarPalabra(...elegir(PALABRAS_ARMAR.larga));
}

const GENERADORES = { matematicas, lectura, escritura };

export function generarRetos(materia, dificultad) {
  const d = Math.max(1, Math.min(5, dificultad));
  return (GENERADORES[materia] ?? lectura)(d);
}

// Un reto de armar palabra tiene más de 3 opciones (son las letras que flotan).
export const esDeArmar = reto => reto.opciones.length > 3;
