// Exportador al formato «universo .json» del Motor del Multiverso del profesor.
// Solo GENERA el archivo a partir del modelo actual (lo que el Administrador haya
// cambiado en el CRUD). No lo envía a ninguna parte: el archivo se descarga y queda
// listo para cargarlo en el motor cuando se decida.
// No es parte del modelo (igual que Almacen): no agrega clases al diagrama.
import { CHARCO_COSTO } from "../datos/contenido.js";

const BASE = {
  "nombre": "Portal del Saber",
  "inspiracion": "Rick y Morty",
  "descripcion": "El garaje de Rick convertido en escuela de portales. Cada portal lleva a una dimensión donde se aprende algo: letras, números o palabras. Los aciertos recargan la energía del portal y al final de cada dimensión espera un guardián.",
  "estilo": "toon",
  "texturas": {
    "suelo": "concrete garage floor",
    "muros": "corrugated metal wall",
    "techos": "metal roof panels"
  },
  "ambiente": {
    "hora": "noche",
    "cielo": "#0b1719",
    "suelo": "#1f3a3f",
    "acento": "#7cf03c",
    "niebla": 0.3,
    "particulas": "estrellas"
  },
  "terreno": {
    "tipo": "plano",
    "tamano": 110
  }
};

const FIJO = {
  "personajes": [
    {
      "id": "rick_profesor",
      "nombre": "Rick Sánchez, profesor del Portal del Saber",
      "estudiante": "De Bonis Rodríguez",
      "descripcion": "El genio del multiverso usa su ciencia para enseñar: convierte su garaje en una escuela de portales donde los niños aprenden a leer, escribir y contar.",
      "x": 6,
      "z": 14,
      "color": "#6dfbd2",
      "frase": "¡Escucha! Cada portal es una lección. Acierta retos y el portal se recarga.",
      "busqueda3d": "",
      "figura": {
        "tipo": "humanoide",
        "base": "mago",
        "altura": 1.9,
        "piel": "#e8d4c0",
        "ropa": "#eef3f0",
        "pantalon": "#7a6a55",
        "pelo": "#bfe6ff",
        "acento": "#6dfbd2",
        "accesorios": [
          "gafas"
        ]
      }
    }
  ],
  "elenco": [
    {
      "id": "holograma_rick",
      "nombre": "Holograma del garaje",
      "descripcion": "Un dron con pantalla holográfica que flota junto al jugador y reacciona a cada respuesta.",
      "frase": "Respuesta correcta… ¡el portal gana energía!",
      "figura": {
        "tipo": "robot",
        "base": "ninguna",
        "altura": 1.4,
        "piel": "#3b5458",
        "ropa": "#6dfbd2",
        "pantalon": "#2c3e42",
        "pelo": "#6dfbd2",
        "acento": "#7cf03c",
        "accesorios": []
      },
      "sprite": "small floating drone with a glowing teal holographic screen showing a smiling face",
      "busqueda3d": "",
      "cantidad": 1,
      "comportamiento": "vuela",
      "cerca": "garaje_rick"
    },
    {
      "id": "companero_morty",
      "nombre": "Compañero de aventuras",
      "descripcion": "Un chico nervioso pero valiente que acompaña al jugador; a veces se equivoca a propósito para que el niño lo corrija.",
      "frase": "¡Uy! Yo iba a escoger la otra… ¿me ayudas?",
      "figura": {
        "tipo": "humanoide",
        "base": "picaro",
        "altura": 1.4,
        "piel": "#e9d8c4",
        "ropa": "#48c9b0",
        "pantalon": "#35506b",
        "pelo": "#6b4a2f",
        "acento": "#48c9b0",
        "accesorios": [
          "mochila"
        ]
      },
      "sprite": "nervous teenage boy with short brown hair, teal t-shirt and blue jeans, carrying a small backpack",
      "busqueda3d": "",
      "cantidad": 1,
      "comportamiento": "deambula",
      "cerca": "garaje_rick"
    },
    {
      "id": "guardian_dimension",
      "nombre": "Guardián de dimensión",
      "descripcion": "Un monstruo de un solo ojo, lleno de púas, que protege cada dimensión. Solo se vence respondiendo bien.",
      "frase": "¡Grrr! Solo los que completaron los tres niveles pueden retarme.",
      "figura": {
        "tipo": "criatura",
        "base": "ninguna",
        "altura": 3,
        "piel": "#3a1f5c",
        "ropa": "#3a1f5c",
        "pantalon": "#2a0f45",
        "pelo": "#ff4d6d",
        "acento": "#ffffff",
        "accesorios": [
          "cuernos"
        ]
      },
      "sprite": "round purple one-eyed monster covered in red spikes, big white eye, friendly cartoon style",
      "busqueda3d": "",
      "cantidad": 1,
      "comportamiento": "quieto",
      "cerca": "arena_guardian"
    },
    {
      "id": "robot_ayudante",
      "nombre": "Robot ayudante",
      "descripcion": "Un robot pequeño que pasa por el garaje cargando inventos.",
      "frase": "Bip. ¿Ya probaste las Botas antigravedad?",
      "figura": {
        "tipo": "robot",
        "base": "ninguna",
        "altura": 1,
        "piel": "#9fb6c3",
        "ropa": "#9fb6c3",
        "pantalon": "#7f97a5",
        "pelo": "#7cf03c",
        "acento": "#7cf03c",
        "accesorios": []
      },
      "sprite": "tiny boxy grey robot with a green antenna light and wheels",
      "busqueda3d": "",
      "cantidad": 2,
      "comportamiento": "deambula",
      "cerca": "garaje_rick"
    }
  ],
  "mesa": {
    "id": "mesa_inventos",
    "nombre": "Mesa de inventos",
    "cantidad": 1,
    "cerca": "garaje_rick",
    "piezas": [
      {
        "forma": "caja",
        "color": "#6b4a2f",
        "pos": [
          0,
          0.5,
          0
        ],
        "tam": [
          4,
          1,
          1.4
        ],
        "rot": [
          0,
          0,
          0
        ],
        "emisivo": false
      },
      {
        "forma": "cilindro",
        "color": "#7cf03c",
        "pos": [
          -1.2,
          1.3,
          0
        ],
        "tam": [
          0.4,
          0.6,
          0.4
        ],
        "rot": [
          0,
          0,
          0
        ],
        "emisivo": true
      },
      {
        "forma": "cilindro",
        "color": "#6dfbd2",
        "pos": [
          -0.3,
          1.3,
          0
        ],
        "tam": [
          0.4,
          0.6,
          0.4
        ],
        "rot": [
          0,
          0,
          0
        ],
        "emisivo": true
      },
      {
        "forma": "cilindro",
        "color": "#ffb054",
        "pos": [
          0.6,
          1.3,
          0
        ],
        "tam": [
          0.4,
          0.6,
          0.4
        ],
        "rot": [
          0,
          0,
          0
        ],
        "emisivo": true
      },
      {
        "forma": "cilindro",
        "color": "#d59bff",
        "pos": [
          1.5,
          1.3,
          0
        ],
        "tam": [
          0.4,
          0.6,
          0.4
        ],
        "rot": [
          0,
          0,
          0
        ],
        "emisivo": true
      }
    ]
  }
};

const COLOR = { lectura: "#d59bff", matematicas: "#ffb054", escritura: "#7cc4ff" };
const OBJETO = { lectura: "libro", matematicas: "estrella", escritura: "esfera" };

const slug = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/^dimension de (las |los |la |el )?/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "dimension";

const regla = (id, texto, disparador, objetivo, puntos, mensaje, extra = {}) =>
  ({ id, texto, disparador, objetivo, valor: 0, puntos, expulsar: false, una_vez: false, mensaje, ...extra });

export const ExportadorMultiverso = {
  // dimensiones: las del modelo (ctx.dimensiones). Devuelve el objeto del universo.
  generar(dimensiones) {
    const n = dimensiones.length;
    const usados = new Set();
    const dims = dimensiones.map((d, i) => {
      let id = slug(d.nombre);
      while (usados.has(id)) id += "_2";
      usados.add(id);
      // En semicírculo frente al garaje, como en el juego.
      const ang = n === 1 ? 0 : -0.9 + (1.8 * i) / (n - 1);
      return {
        d, id, color: COLOR[d.materia] ?? "#7cf03c",
        x: Math.round(Math.sin(ang) * 26), z: Math.round(-Math.cos(ang) * 26),
      };
    });

    const estructuras = [
      { id: "garaje_rick", tipo: "casa", nombre: "Garaje de Rick", x: 0, z: 8, escala: 1.8, color: "#6b7a7d", busqueda3d: "" },
    ];
    const objetos = [
      { id: "cristal_energia", tipo: "cristal", nombre: "Cristal de energía del portal", cantidad: 12, x: 0, z: -4, radio: 26, color: "#7cf03c" },
    ];
    const elementos = [FIJO.mesa];
    const reglas = [
      regla("r_inicio", "Al llegar, Rick explica el juego.", "inicio", "", 0,
        "¡Bienvenido al garaje de Rick! Recoge cristales de energía y cruza los portales para aprender.", { una_vez: true }),
      regla("r_cristal", "Cada cristal de energía recarga el portal.", "recoger", "cristal_energia", 10, "+10 de energía para el portal."),
    ];

    for (const { d, id, color, x, z } of dims) {
      const fuera = Math.hypot(x, z) + 9;
      const ang = Math.atan2(x, -z);
      const cx = Math.round(Math.sin(ang) * fuera), cz = Math.round(-Math.cos(ang) * fuera);
      const niveles = d.niveles.filter(nv => nv.dificultad !== "jefe").length;
      estructuras.push(
        { id: `portal_${id}`, tipo: "portal", nombre: d.nombre, x, z, escala: 1.6, color, busqueda3d: "" },
        { id: `cristal_${id}`, tipo: "cristal", nombre: `Cristales de nivel · ${d.nombre}`, x: cx, z: cz, escala: 1.2, color, busqueda3d: "" },
      );
      objetos.push({ id: `premio_${id}`, tipo: OBJETO[d.materia] ?? "estrella", nombre: `Premio de ${d.nombre}`, cantidad: 4, x: cx, z: cz, radio: 8, color });
      elementos.push({ id: `bloques_${id}`, nombre: `Bloques flotantes · ${d.nombre}`, cantidad: 5, cerca: `portal_${id}`, piezas: [
        { forma: "caja", color: "#f4fbff", pos: [0, 1.6, 0], tam: [0.9, 0.9, 0.9], rot: [0.3, 0.6, 0], emisivo: false },
        { forma: "caja", color, pos: [0, 1.6, 0], tam: [0.95, 0.2, 0.95], rot: [0.3, 0.6, 0], emisivo: true },
      ] });
      reglas.push(d.desbloqueada
        ? regla(`r_portal_${id}`, `Cruzar el portal abre la ${d.nombre} (${d.materia}, ${niveles} niveles y un guardián).`, "entrar", `portal_${id}`, 5, `Entraste a la ${d.nombre}.`, { una_vez: true })
        : regla(`r_portal_${id}`, `La ${d.nombre} empieza bloqueada: entrar sin energía te devuelve.`, "entrar", `portal_${id}`, -15, "¡Sin energía suficiente! El portal te devuelve. -15", { expulsar: true }));
      reglas.push(regla(`r_premio_${id}`, `Cada premio de la ${d.nombre} suma puntos.`, "recoger", `premio_${id}`, 15, "¡Reto superado! +15"));
    }

    estructuras.push(
      { id: "arena_guardian", tipo: "arena", nombre: "Arena del Guardián", x: 0, z: -48, escala: 0.8, color: "#ff4d6d", busqueda3d: "" },
      { id: "lago_fluido", tipo: "lago", nombre: "Charco de fluido de portales", x: -30, z: 28, escala: 0.8, color: "#7cf03c", busqueda3d: "" },
      { id: "bosque_alien", tipo: "bosque", nombre: "Bosque de árboles alienígenas", x: 34, z: 30, escala: 0.8, color: "#3a7d44", busqueda3d: "" },
    );
    reglas.push(
      regla("r_guardian", "Entrar a la arena del guardián sin haber completado los niveles cuesta puntos.", "entrar", "arena_guardian", -20,
        "El guardián ruge: vuelve cuando hayas completado los tres niveles. -20", { expulsar: true }),
      regla("r_fluido", "El fluido de portales es pegajoso: pisarlo te saca y cuesta energía.", "entrar", "lago_fluido", -CHARCO_COSTO * 2,
        `¡Puaj! Fluido de portales. -${CHARCO_COSTO * 2}`, { expulsar: true }),
      regla("r_hablar_rick", "Hablar con Rick da una pista.", "hablar", "rick_profesor", 5,
        "Rick: «Fallar no quita puntos: te doy una pista y lo repasamos.» +5", { una_vez: true }),
      regla("r_narrativa", `En el juego original hay ${n} dimensiones; cada reto correcto recarga 10 de energía y fallar nunca quita puntos: Rick da una pista y después explica.`,
        "narrativa", "", 0, "", { una_vez: true }),
    );

    return {
      ...structuredClone(BASE),
      estructuras,
      personajes: structuredClone(FIJO.personajes),
      elenco: structuredClone(FIJO.elenco),
      elementos,
      objetos,
      reglas,
      jugador: { puntos: 100, salto: true, volar: false, velocidad: 7, inicio: { x: 0, z: 30 } },
    };
  },

  // Descarga el archivo en el computador. No lo sube a ningún servidor.
  descargar(dimensiones, nombreArchivo = "portal_del_saber.universo.json") {
    const texto = JSON.stringify(this.generar(dimensiones), null, 2);
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return texto;
  },
};
