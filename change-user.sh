#!/bin/bash

# Verificar si se pasó el argumento --facu
if [ "$1" != "--facu" ]; then
    echo "Error: Debe usar el argumento --facu como primer parámetro"
    exit 1
fi

# Leer el email del archivo .env
FORGE_EMAIL=$(grep FORGE_EMAIL .env | cut -d '=' -f2)

# Solicitar el token de forma segura
echo "Por favor, ingresa tu FORGE_API_TOKEN:"
read -s FORGE_API_TOKEN
echo "" # Nueva línea después del input secreto

# Verificar si se pasó el argumento --auto
if [ "$2" = "--auto" ]; then
    # Modo automático: exportar directamente
    export FORGE_API_TOKEN="$FORGE_API_TOKEN"
    export FORGE_EMAIL="$FORGE_EMAIL"
    echo "Variables de entorno actualizadas:"
    echo "FORGE_EMAIL=$FORGE_EMAIL"
    echo "FORGE_API_TOKEN ha sido configurado"
    echo "Nota: Este modo solo funcionará si ejecutas el script con 'source'"
else
    # Modo manual: generar archivo temporal
    echo "export FORGE_API_TOKEN='$FORGE_API_TOKEN'" > .env.temp
    echo "export FORGE_EMAIL='$FORGE_EMAIL'" >> .env.temp
    echo "\nPara actualizar las variables de entorno, ejecuta:"
    echo "source .env.temp && rm .env.temp"
fi
