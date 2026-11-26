// Clase abstracta Usuario (diagrama de clases).
// Conceptos del curso: CLASE ABSTRACTA y HERENCIA.
// ¿Para qué? Guarda lo que tienen en común Jugador y Administrador: id, nombre, correo,
// contraseña privada (#contrasena, encapsulamiento) e iniciar/cerrar sesión.
// ¿Por qué abstracta? Nadie en el juego es "usuario a secas": o es Jugador o es Administrador.
// Por eso, si alguien hace new Usuario(...), sale un error.
// Herencia: Jugador extends Usuario y Administrador extends Usuario (no repiten ese código).
export class Usuario {
  #contrasena;

  constructor(id, nombre, correo = "", contrasena = "") {
    if (new.target === Usuario) {
      throw new Error("Usuario es abstracta: crea un Jugador o un Administrador.");
    }
    this.id = id;
    this.nombre = nombre;
    this.correo = correo;
    this.#contrasena = contrasena;
    this.sesionActiva = false;
  }

  get contrasena() { return this.#contrasena; }

  // El jugador (niño) entra solo con su nombre; el administrador necesita contraseña.
  iniciarSesion(contrasenaIngresada = "") {
    if (this.#contrasena && contrasenaIngresada !== this.#contrasena) {
      this.sesionActiva = false;
      return false;
    }
    this.sesionActiva = true;
    return true;
  }

  cerrarSesion() {
    this.sesionActiva = false;
  }
}
