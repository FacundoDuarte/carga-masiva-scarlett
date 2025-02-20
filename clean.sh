#!/bin/bash

# Eliminar archivos en la raíz
rm -rf node_modules bun.lock

# Eliminar node_modules en todos los subdirectorios
find . -name "node_modules" -type d -exec rm -rf {} +

# Eliminar directorios de build
find . -type d \( -name ".build" -o -name "dist" -o -name ".aws-sam" -o -name ".turbo" \) -exec rm -rf {} +
