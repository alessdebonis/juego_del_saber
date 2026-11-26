// Punto de entrada de los Controladores (la C de MVC).
// Regla del curso: cada caso de uso es una clase control con su mismo nombre.
//
// PATRÓN DE DISEÑO: FACTORY (fábrica).
// ¿Para qué? crearControladores() es el ÚNICO lugar donde se crean los 24 controladores.
// La vista y main.js no hacen "new ...Controlador" por su cuenta: piden los objetos ya hechos.
// ¿Por qué? Si mañana cambia cómo se crea un controlador, se cambia aquí y en ningún otro sitio.
// Además, la fábrica revisa que cada uno cumpla la INTERFAZ CasoDeUso (ver CasoDeUso.js).
import { CasoDeUso, implementa } from "./CasoDeUso.js";
import { IniciarSesionControlador } from "./IniciarSesionControlador.js";
import { ElegirPersonajeControlador } from "./ElegirPersonajeControlador.js";
import { PersonalizarPersonajeControlador } from "./PersonalizarPersonajeControlador.js";
import { ViajarPorPortalControlador } from "./ViajarPorPortalControlador.js";
import { DesbloquearDimensionControlador } from "./DesbloquearDimensionControlador.js";
import { ElegirNivelControlador } from "./ElegirNivelControlador.js";
import { ExplorarDimensionControlador } from "./ExplorarDimensionControlador.js";
import { InteractuarConObjetoControlador } from "./InteractuarConObjetoControlador.js";
import { JugarNivelControlador } from "./JugarNivelControlador.js";
import { ResponderRetoControlador } from "./ResponderRetoControlador.js";
import { PedirPistaControlador } from "./PedirPistaControlador.js";
import { GanarInventoControlador } from "./GanarInventoControlador.js";
import { UsarInventoControlador } from "./UsarInventoControlador.js";
import { GuardarProgresoControlador } from "./GuardarProgresoControlador.js";
import { EnviarReporteProgresoControlador } from "./EnviarReporteProgresoControlador.js";
import { CompletarMisionDiariaControlador } from "./CompletarMisionDiariaControlador.js";
import { VerLogrosControlador } from "./VerLogrosControlador.js";
import { PausarPartidaControlador } from "./PausarPartidaControlador.js";
import { ConfigurarOpcionesControlador } from "./ConfigurarOpcionesControlador.js";
import { CerrarSesionControlador } from "./CerrarSesionControlador.js";
import { AdministrarDimensionesControlador } from "./AdministrarDimensionesControlador.js";
import { AdministrarNivelesControlador } from "./AdministrarNivelesControlador.js";
import { AdministrarRetosControlador } from "./AdministrarRetosControlador.js";
import { CrearDimensionDesdeMaterialControlador } from "./CrearDimensionDesdeMaterialControlador.js";

export function crearControladores(ctx) {
  ctx.c = {
    iniciarSesion: new IniciarSesionControlador(ctx),
    elegirPersonaje: new ElegirPersonajeControlador(ctx),
    personalizarPersonaje: new PersonalizarPersonajeControlador(ctx),
    viajarPorPortal: new ViajarPorPortalControlador(ctx),
    desbloquearDimension: new DesbloquearDimensionControlador(ctx),
    elegirNivel: new ElegirNivelControlador(ctx),
    explorarDimension: new ExplorarDimensionControlador(ctx),
    interactuarConObjeto: new InteractuarConObjetoControlador(ctx),
    jugarNivel: new JugarNivelControlador(ctx),
    responderReto: new ResponderRetoControlador(ctx),
    pedirPista: new PedirPistaControlador(ctx),
    ganarInvento: new GanarInventoControlador(ctx),
    usarInvento: new UsarInventoControlador(ctx),
    guardarProgreso: new GuardarProgresoControlador(ctx),
    enviarReporteProgreso: new EnviarReporteProgresoControlador(ctx),
    completarMisionDiaria: new CompletarMisionDiariaControlador(ctx),
    verLogros: new VerLogrosControlador(ctx),
    pausarPartida: new PausarPartidaControlador(ctx),
    configurarOpciones: new ConfigurarOpcionesControlador(ctx),
    cerrarSesion: new CerrarSesionControlador(ctx),
    administrarDimensiones: new AdministrarDimensionesControlador(ctx),
    administrarNiveles: new AdministrarNivelesControlador(ctx),
    administrarRetos: new AdministrarRetosControlador(ctx),
    crearDimensionDesdeMaterial: new CrearDimensionDesdeMaterialControlador(ctx),
  };
  // Cada controlador debe cumplir el contrato de la interfaz CasoDeUso (tener ejecutar()).
  for (const controlador of Object.values(ctx.c)) implementa(controlador, CasoDeUso);
  return ctx.c;
}
