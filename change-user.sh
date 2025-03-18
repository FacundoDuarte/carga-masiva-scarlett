#!/bin/bash

# Verificar si se pasó el argumento --facu
if [ "$1" != "--facu" ]; then
    echo "Error: Debe usar el argumento --facu como primer parámetro"
    exit 1
fi

# Leer el email del archivo .env
FORGE_EMAIL=$(grep FORGE_EMAIL .env | cut -d '=' -f2)
FORGE_API_TOKEN=$(grep FORGE_API_TOKEN .env | cut -d '=' -f2)


# Solicitar el token de forma segura si no está definido FORGE_API_TOKEN o FORGE_EMAIL
if [ -z "$FORGE_EMAIL" ]; then
    echo "Por favor, ingresa tu FORGE_EMAIL:"
    read -s FORGE_EMAIL
    echo "" # Nueva línea después del input secreto
fi

if [ -z "$FORGE_API_TOKEN" ]; then
    echo "Por favor, ingresa tu FORGE_API_TOKEN:"
    read -s FORGE_API_TOKEN
    echo "" # Nueva línea después del input secreto
fi

export FORGE_EMAIL="$FORGE_EMAIL"
export FORGE_API_TOKEN="$FORGE_API_TOKEN"
