# Portal del Saber — juego educativo 3D (universo Rick y Morty)

Juego web para niños que enseña lectura, matemáticas y escritura. Está programado en **JavaScript con clases** y el mundo 3D usa **WebGL** a través de Three.js.

## Cómo abrirlo

**Lo más fácil (Mac):** doble clic en `Abrir juego.command`. Abre el juego en el navegador. Si quieres Rick IA, crea en esta carpeta un archivo llamado `.env` con la línea `ANTHROPIC_API_KEY=tu_llave`. Ese archivo nunca se sube a GitHub; no escribas la llave dentro de `Abrir juego.command`.

No abras `index.local.html` con doble clic: el navegador bloquea los módulos de JavaScript desde un archivo y la pantalla queda en blanco. Siempre por http://localhost.

**Con Rick IA (recomendado):** necesitas Node 18 o más y tu llave de la API de Claude.
```
ANTHROPIC_API_KEY=tu_llave node servidor.mjs
```
Luego abre http://localhost:8000. La llave se queda en el servidor y nunca llega al navegador. El modelo por defecto es **Claude Sonnet 5.5** (`claude-sonnet-5-5`), que piensa poco antes de responder (`RICK_ESFUERZO=low`). Si alguna vez se niega a responder, Anthropic reintenta en otro modelo automáticamente; si aun así no responde, el juego sigue con los retos locales. Para gastar unas 20 veces menos, usa `RICK_MODELO=claude-haiku-5-5`.

**Protección de tus créditos:** el navegador solo le manda al servidor datos (materia, dificultad, edad, o el material del profe) y **el servidor arma las instrucciones** para la IA, así nadie puede usar tu llave para pedirle otra cosa. Además hay límites de pedidos, que se pueden cambiar con variables de entorno:
- `LIMITE_POR_HORA` (120): retos con IA por persona por hora.
- `LIMITE_MATERIAL_POR_HORA` (15): mundos desde material por persona por hora.
- `LIMITE_TRANSCRIBIR_POR_HORA` (15): fotos o PDF escaneados leídos con IA por persona por hora.
- `LIMITE_POR_DIA` (1000): pedidos en total por día.

Cuando se llega al límite, el juego sigue con los retos locales.

**Sin IA:** `python3 -m http.server 8000` y abre http://localhost:8000/index.local.html. El juego usa los generadores locales.

**Publicado en Claude:** la página usa la IA de la cuenta de quien juega. La primera vez, Claude pide permiso.

## Publicarlo en internet (un link para cualquiera, con tu llave)
El juego está listo para **Render** (render.com, plan gratis). Render toma el código de GitHub y lee `render.yaml`.
1. Sube el proyecto a un repositorio de GitHub (puede ser privado).
2. En render.com entra con tu cuenta de GitHub: **New > Blueprint** y elige el repositorio.
3. Render te pide `ANTHROPIC_API_KEY`: pega tu llave ahí. **Nunca** la pongas en el código.
4. Cuando termine, Render te da el link (algo como `https://portal-del-saber.onrender.com`). Ese es el link para compartir.

**Antes de compartirlo:**
- Crea una llave solo para este juego en console.anthropic.com y ponle un **límite de gasto mensual**. Es la protección más fuerte: los límites del juego (120 retos por persona por hora, 15 mundos y 15 fotos por persona por hora, 1000 pedidos al día; con Sonnet 5.5 cada pedido de retos cuesta 1 o 2 centavos de dólar, un mundo unos 5 y una foto unos 4) se cambian en Render > Environment, pero alguien decidido podría saltarse el límite por persona.
- Con el plan gratis, Render apaga el juego si nadie entra en 15 minutos: la primera visita después tarda cerca de un minuto en abrir.
- Cada persona guarda su progreso y sus mundos en su propio navegador. Para pasar un mundo a otra persona: **Exportar mundo** e **Importar mundo**.
- La contraseña de administrador de la demo (`rick123`) se ve en la pantalla: cualquiera que abra el link puede crear mundos en su navegador (con los límites de arriba).

## Estructura (MVC)
| Carpeta | Qué es | Diagrama |
|---|---|---|
| `modelo/` | Las 13 clases del diagrama de clases, con los mismos atributos, métodos y relaciones | Diagrama de clases |
| `controladores/` | Una clase control por cada caso de uso (24), con el mismo nombre | Diagrama de casos de uso |
| `vista/` | `Mundo3D.js` (WebGL, moverse en el mundo) y `Vista.js` (pantallas y botones) | — |
| `datos/` | Contenido inicial y generadores de retos | — |
| `persistencia/` | `Almacen.js` guarda el progreso en el navegador; `ExportadorMultiverso.js` genera el `.json` para el motor del profesor | — |
| `servicios/` | `RickIA.js`: conexión con la IA; `instrucciones.js`: lo que se le pide a la IA (lo usan el navegador y el servidor); `leerArchivo.js`: pasa a texto los archivos del profe | — |
| `servidor.mjs` | Servidor que sirve el juego y conecta con la API de Claude, con límites de pedidos (local o en Render) | — |
| `render.yaml` | Receta para publicarlo en Render con un link | — |
| `package.json` | Le dice a Node que el proyecto usa módulos modernos (no instala nada) | — |
| `main.js` | Conecta modelo, controladores y vista | — |

### Relaciones del diagrama en el código
- **Herencia:** `Jugador extends Usuario` y `Administrador extends Usuario`. `Usuario` es abstracta y no se puede instanciar.
- **Composición:** el `Jugador` crea su `Portal` y su `Progreso`, la `Dimension` crea sus `Nivel`es y el `Nivel` crea sus `Reto`s.
- **Agregación:** el `Jugador` colecciona `Invento`s que ya existen, y el `Progreso` junta `Logro`s y `MisionDiaria`s.
- **Composición en cada partida:** `ElegirNivelControlador` crea un `Nivel` nuevo para cada partida, con sus propios retos generados.
- **«include»:** `JugarNivelControlador` siempre llama a `ResponderReto`, `GanarInvento` y `GuardarProgreso`, y `GuardarProgreso` siempre llama a `EnviarReporteProgreso`.
- **«extend»:** `DesbloquearDimension` (cuando el portal está bloqueado), `InteractuarConObjeto` (tocar un cristal), `PedirPista`, `UsarInvento`, `PersonalizarPersonaje` y `CrearDimensionDesdeMaterial` (extiende Administrar dimensiones). Todos son opcionales.

## Rick con inteligencia artificial
`servicios/RickIA.js` le pide a Claude 4 retos nuevos a la vez, según la materia, la dificultad (1 a 5) y la edad del niño. A la IA le pasa:
- los últimos enunciados que vio, para que no se repitan;
- los retos que falló, para que invente uno parecido y pueda practicar;
- reglas para que todo sea apto para niños, en español, con una sola respuesta correcta y una pista que no diga la respuesta.

El juego revisa cada respuesta de la IA (3 opciones distintas, índice válido, palabra para armar de 3 a 7 letras) y descarta lo que no cumpla. Los retos llegan en segundo plano, así que el niño nunca espera más de 5 segundos. Si la IA no responde o no hay permiso, el juego sigue con los generadores locales. Los retos inventados por la IA llevan la marca "Creado por IA".

## Mundos desde el material del profe (IA con control)
En el panel de administrador, **Crear mundo desde material (IA)** convierte el texto de una clase en una dimensión nueva. Lo hace `CrearDimensionDesdeMaterialControlador` (caso de uso «extend» de Administrar dimensiones).

1. El profe pega el texto, o carga o arrastra sus archivos (de 200 a 12.000 caracteres en total), le pone nombre al mundo y elige la edad. Cada archivo se pasa a texto y aparece en el cuadro para que el profe lo revise (`servicios/leerArchivo.js`):
   - **Sin IA** (en el navegador, gratis y exacto): PDF con texto, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), OpenDocument (.odt, .odp, .ods), RTF, páginas web y texto (.txt, .md, .csv, .json).
   - **Con IA** (por el servidor, con su propio límite): fotos (.jpg, .png, .webp, .gif) y PDF escaneados. La IA solo transcribe; el profe revisa que el texto diga lo mismo que el original.
   - Los formatos viejos de Office (.doc, .ppt, .xls), audio y video no se pueden leer: el juego dice qué hacer.
2. La IA propone hasta 15 preguntas. A cada una le tiene que pegar **la frase exacta del material** de donde sale.
3. El juego **no se fía de la IA**: `controladores/verificarMaterial.js` descarta la pregunta si la frase no está en el material, si la respuesta correcta no sale de esa frase, si faltan datos o si hay opciones repetidas. Si la pista dice la respuesta, la cambia. Si otra opción también sale de la frase, avisa al profe.
4. El profe aprueba, corrige o descarta cada pregunta. **El niño solo ve las aprobadas.**
5. Nace la dimensión (materia `material`) con 3 niveles, un guardián y sus propios inventos.

En estos mundos la IA no inventa nada mientras el niño juega: no se usan generadores ni IA en vivo, solo el banco aprobado (las opciones cambian de orden cada vez). Cuando el niño falla dos veces, Rick explica con la frase del material: «Según tu material: …».

**Compartir:** el contenido se guarda en el navegador del administrador. Para llevar un mundo a otro computador: **Exportar mundo** (descarga un `.json`) y allá **Importar mundo**. El archivo se revisa antes de usarlo.

**Límites:** para proponer preguntas hace falta la IA (llave en `Abrir juego.command` o versión publicada en Claude). Sin IA, el juego avisa y todo lo demás funciona igual. Ninguna IA garantiza no equivocarse nunca; por eso la revisión automática y la aprobación del profe van siempre antes de que el niño vea algo.

## Cómo aprende el niño
- **Retos que no se repiten:** `datos/generadores.js` crea retos nuevos cada vez, con 5 niveles de dificultad por materia. Matemáticas va de contar a multiplicar, Lectura de sílabas a comprender causas, y Escritura de letras sueltas a ortografía.
- **Dificultad que se adapta:** si responde bien 2 retos seguidos, la dificultad sube; si falla 2 seguidos, baja. Se guarda en `Progreso.nivelActual` (1 a 5).
- **Aprender del error:** al primer error Rick da una pista. Al segundo, explica la respuesta, y ese reto vuelve más tarde como **repaso**.
- **Material:** en Matemáticas aparecen gemas para contar. En Lectura, cada palabra se puede tocar para oírla.
- **Banco del profe:** los retos que agrega el administrador se mezclan con los generados.

## Cómo se juega
- Muévete con **WASD o las flechas**, haz **clic** en el piso o en un portal, o usa la **palanca** en el celular.
- Entra a un portal y toca un cristal (nivel 1, 2 o 3).
- **Responde corriendo:** las opciones son orbes en el mundo (rosa A, azul B, amarillo C). Corre al correcto o tócalo en el panel.
- **Atrapa letras:** en Escritura, las letras flotan por la dimensión. Atrápalas en orden para armar la palabra.
- **Racha:** los aciertos seguidos multiplican la energía (×2 desde 3 seguidos, ×3 desde 6).
- Completa 5 retos para ganar un invento.
- **Guardado automático:** el progreso se guarda después de cada reto, al salir de un nivel y al cerrar o recargar la página. Si el niño deja un nivel a medias, conserva la energía, los retos y los logros que ya ganó.
- **Guardián de dimensión:** cuando el niño gana los inventos de los niveles 1, 2 y 3, despierta el guardián (nivel 4). Cada respuesta correcta le baja una vida, y al vencerlo se gana un **invento legendario**.
- **Inventos que cambian el mundo:** las Botas antigravedad (saltar alto con la barra espaciadora), el Propulsor de neutrinos (correr más rápido) y la Estela de portal (atrapar respuestas desde más lejos) se activan desde Logros. El Rayo encogedor achica al personaje al usarlo.
- **Mapa del multiverso:** el botón MAPA muestra cuánto lleva de cada dimensión. Las estrellas sobre los portales y los cristales muestran los niveles completados.
- La Dimensión de las Palabras se abre con 30 de energía (o con el modo demo en Opciones).
- Administrador: en la pantalla de inicio, "Soy administrador". La contraseña de la demo es `rick123`.

## Para el parcial: dónde está cada concepto de POO
| Concepto | Dónde | Para qué / por qué |
|---|---|---|
| **MVC** | `modelo/` (entidades), `controladores/` (control), `vista/` (vista) | Separar los datos, las reglas del juego y lo que se ve |
| **Casos de uso → controladores** | `controladores/index.js` | 24 clases control, una por caso de uso y con su mismo nombre |
| **Clase abstracta** | `modelo/Usuario.js` | Lo común de Jugador y Administrador; `new Usuario()` da error porque nadie es "usuario a secas" |
| **Herencia** | `modelo/Jugador.js`, `modelo/Administrador.js` (`extends Usuario`) | No repetir sesión, nombre ni contraseña |
| **Interfaz** | `controladores/CasoDeUso.js` | Contrato: todo controlador debe tener `ejecutar()`. La fábrica lo revisa al arrancar (como `implements` en Java) |
| **Patrón Factory** | `crearControladores()` en `controladores/index.js` | Un solo lugar crea los 24 controladores y revisa la interfaz |
| **Patrón Observer** | `suscribir()` en `servicios/RickIA.js`, usado en `main.js` | La IA avisa a la vista cuando cambia de estado sin depender de ella |
| **Patrón Singleton** | `persistencia/Almacen.js` | Un solo almacén para todo el juego, para que no haya dos guardando cosas distintas |
| **Encapsulamiento** | `#contrasena` en `Usuario` | La contraseña es privada; solo se compara dentro de la clase |

Prueba rápida en la consola del navegador (F12): `juego.c` muestra los 24 controladores.

**Diagramas:** las fuentes PlantUML están en `docs/diagramas/` (con su PNG y SVG). Las imágenes de la carpeta principal ya están actualizadas y las anteriores quedaron en `docs/diagramas/anteriores/`.

**Cambios en los diagramas por los mundos desde material:**
- Casos de uso: nuevo **Crear dimensión desde material**, actor Admin, «extend» de Administrar dimensiones.
- Clases: `Reto` tiene un atributo nuevo, `fuente` (la frase del material de donde sale la respuesta). No hay clases nuevas: el mundo nuevo es una `Dimension` con sus `Nivel`es y `Reto`s, creados con los métodos que ya tenía `Administrador` (dependencia «administra»).

## Novedades de esta versión (al estilo del Motor del Multiverso)
Ninguna agrega clases al modelo: todo está dentro de los controladores que ya existían.
- **Reglas de cada dimensión:** al entrar por primera vez sale un panel con las reglas (como el panel de reglas del motor). Se vuelven a ver con el botón **REGLAS**. Lo hace `ExplorarDimensionControlador`.
- **Zonas prohibidas:** en cada dimensión hay dos charcos verdes de fluido de portal. Si el niño los pisa, lo empujan afuera y cuestan 5 de energía (como las reglas que "expulsan" en el motor). Mientras hay un reto abierto no molestan. Lo hace `InteractuarConObjetoControlador.pisarCharco()`.
- **Exportar al Multiverso (.json):** en el panel de administrador. Descarga el universo con el formato del motor (estructuras, personajes, elenco, elementos, objetos, reglas y jugador), armado con las dimensiones que haya en ese momento. **No se envía a ninguna web**: solo queda listo para cargarlo en el motor cuando se decida. Lo hace `AdministrarDimensionesControlador.exportar()`.

Rick aparece como un holograma con cara de pantalla y Morty como un avatar sencillo; los dos reaccionan a cada respuesta. No se usan imágenes, voces ni diseños de la serie.
