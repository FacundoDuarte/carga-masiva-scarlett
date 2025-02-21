#!/bin/bash

# Limpiar el directorio de artifacts si existe
rm -rf "$ARTIFACTS_DIR"

# Crear el directorio para la layer
mkdir -p "$ARTIFACTS_DIR/utils"

# Compilar el código TypeScript
bun build ./src/index.ts --outdir "$ARTIFACTS_DIR/utils" --target bun

# Copiar solo los archivos TypeScript necesarios
cp src/*.ts "$ARTIFACTS_DIR/utils/"

# Copiar package.json para las dependencias
cp package.json "$ARTIFACTS_DIR/utils/"
