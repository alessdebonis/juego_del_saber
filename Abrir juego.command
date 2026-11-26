#!/bin/bash
# Doble clic para abrir el Portal del Saber en el navegador (Mac).
# Para jugar con Rick IA, guarda tu llave de Claude en un archivo llamado .env en esta carpeta, con esta línea:
#   ANTHROPIC_API_KEY=tu_llave
# El archivo .env nunca se sube a GitHub. NO escribas la llave en este archivo si vas a subir el proyecto.
# Sin llave, el juego funciona igual con los retos locales.
LLAVE=""
cd "$(dirname "$0")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi
if [ -n "$LLAVE" ]; then export ANTHROPIC_API_KEY="$LLAVE"; fi

# Si el Portal del Saber de esta carpeta ya estaba abierto, se cierra para arrancarlo de nuevo.
# Solo se cierra ese servidor: cualquier otro programa que use el puerto 8000 se deja en paz.
for pid in $(lsof -ti tcp:8000 -sTCP:LISTEN 2>/dev/null); do
  if ps -o command= -p "$pid" | grep -q "servidor.mjs" && lsof -a -p "$pid" -d cwd -Fn | grep -qxF "n$PWD"; then
    kill "$pid"
  fi
done
sleep 0.5

# Si otro programa ocupa el 8000, se usa el siguiente puerto libre.
PUERTO=8000
while lsof -ti tcp:$PUERTO -sTCP:LISTEN >/dev/null 2>&1; do
  PUERTO=$((PUERTO + 1))
  if [ $PUERTO -gt 8010 ]; then
    echo "Los puertos 8000 a 8010 están ocupados por otros programas. Cierra alguno y vuelve a abrir el juego."
    exit 1
  fi
done
if [ $PUERTO -ne 8000 ]; then
  echo "Otro programa está usando el puerto 8000, así que el juego se abre en el $PUERTO."
  echo "Ojo: el progreso guardado en http://localhost:8000 no aparece en este puerto."
fi

PORT=$PUERTO node servidor.mjs &
sleep 1
open "http://localhost:$PUERTO"
echo ""
echo "Juego abierto en http://localhost:$PUERTO — deja esta ventana abierta mientras juegas."
wait
