#!/bin/bash

# Desplegar con SAM
sam deploy \
  --template-file template.yml \
  --config-file sam-config-dev.toml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

# Obtener y guardar URLs de las funciones Lambda
BULK_OPS_URL=$(aws cloudformation describe-stacks \
  --stack-name remote-app \
  --query 'Stacks[0].Outputs[?OutputKey==`BulkOperationsRemoteInvokeFunctionUrl`].OutputValue' \
  --output text)

# Guardar URLs en archivo de entorno
echo "BULK_OPERATIONS_URL=$BULK_OPS_URL" > .env 