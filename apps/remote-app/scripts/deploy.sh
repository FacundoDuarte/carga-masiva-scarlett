#!/bin/bash

# Desplegar con SAM
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