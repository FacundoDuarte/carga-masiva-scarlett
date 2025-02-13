#!/bin/bash

# Desplegar con SAM
sam deploy \
  --template-file template.yml \
  --config-file sam-config-dev.toml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

# Obtener y guardar URLs de las funciones Lambda
EXECUTION_TRIGGER_URL=$(aws cloudformation describe-stacks \
  --stack-name scarlet-operations-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ExecutionTriggerUrl`].OutputValue' \
  --output text)

# Guardar URLs en archivo de entorno
echo "EXECUTION_TRIGGER_URL=$EXECUTION_TRIGGER_URL" > .env 