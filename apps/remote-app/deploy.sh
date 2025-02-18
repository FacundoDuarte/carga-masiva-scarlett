#!/bin/bash

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./deploy.sh [opciones]"
    echo "Opciones:"
    echo "  --preview    Solo muestra los cambios que se aplicarán sin desplegar"
    echo "  --help      Muestra esta ayuda"
    exit 0
}

# Procesar argumentos
PREVIEW_ONLY=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --preview)
            PREVIEW_ONLY=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            echo "Opción desconocida: $1"
            show_help
            ;;
    esac
done

echo "🏗️  Ejecutando build..."
# Compilar TypeScript
tsc

# Crear el directorio de build si no existe
mkdir -p .build

# Empaquetar con esbuild
echo "📦 Empaquetando con esbuild..."
node -e 'import("esbuild").then(esbuild => esbuild.build({
    entryPoints: ["src/**/*.ts"],
    bundle: true,
    outdir: ".build",
    platform: "node",
    target: "node18",
    format: "esm",
    external: ["aws-sdk"],
})).catch(() => process.exit(1))'

if [ "$PREVIEW_ONLY" = true ]; then
    echo "🔍 Previsualizando cambios..."
    sam deploy \
        --template-file template.yml \
        --config-file sam-config-dev.toml \
        --capabilities CAPABILITY_IAM \
        --no-execute-changeset
    exit 0
fi

echo "🚀 Desplegando con SAM..."
sam deploy \
  --template-file template.yml \
  --config-file sam-config-dev.toml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

# Guardar URLs en archivo de entorno
# Obtener los outputs de CloudFormation sin paginación
outputs=$(aws cloudformation describe-stacks --query "Stacks[0].Outputs" --output json --no-cli-pager)

# Verificar si la salida es válida
if ! echo "${outputs}" | jq . > /dev/null 2>&1; then
    echo "Error: La salida de AWS no es un JSON válido."
    exit 1
fi

# Crear archivo .env si no existe
touch .env

# Detectar el sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    update_env() {
        local key=$1
        local value=$2
        if grep -q "^${key}=" .env; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" .env
        else
            echo "${key}=${value}" >> .env
        fi
    }
else
    # Linux y otros
    update_env() {
        local key=$1
        local value=$2
        if grep -q "^${key}=" .env; then
            sed -i "s|^${key}=.*|${key}=${value}|" .env
        else
            echo "${key}=${value}" >> .env
        fi
    }
fi

# Iterar sobre los outputs y guardarlos en el archivo .env
echo "${outputs}" | jq -c '.[]' | while read -r row; do
    key=$(echo "${row}" | jq -r '.OutputKey')
    value=$(echo "${row}" | jq -r '.OutputValue')
    update_env "${key}" "${value}"
done

echo "Archivo .env actualizado correctamente" 