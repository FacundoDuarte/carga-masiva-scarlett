# Makefile para la función AWS Lambda validate-session
.PHONY: build-ValidateSessionFunction

FUNCTION_NAME = validate-session
ENTRY_FILE = $(FUNCTION_NAME).mts

build-ValidateSessionFunction:
	@echo "🏗️ Compilando $(FUNCTION_NAME)..."
	# Crear directorio de artefactos si no existe
	mkdir -p $(ARTIFACTS_DIR)
	
	# Copiar archivos fuente al directorio de artefactos
	cp $(ENTRY_FILE) $(ARTIFACTS_DIR)/
	
	# Compilar TypeScript a JavaScript directamente en el directorio de artefactos
	cd $(ARTIFACTS_DIR) && bun build ./$(ENTRY_FILE) --outdir ./ --target node --format esm --minify --external bun --external /opt/utils/index
	
	# Crear validate-session.mjs si no existe
	cd $(ARTIFACTS_DIR) && test -f $(FUNCTION_NAME).js && mv $(FUNCTION_NAME).js $(FUNCTION_NAME).mjs || echo "Usando archivo existente"
	
	# Crear package.json en el directorio de artefactos
	echo '{"name": "$(FUNCTION_NAME)", "version": "1.0.0", "type": "module", "dependencies": {"@aws-sdk/client-sfn": "^3.750.0", "@smithy/core": "^3.1.4", "aws-lambda": "^1.0.7", "jose": "^5.9.6", "uuid": "^11.0.5", "xlsx": "^0.18.5"}}' > $(ARTIFACTS_DIR)/package.json
	
	# Instalar dependencias en el directorio de artefactos (evitando errores de enlaces simbólicos)
	cd $(ARTIFACTS_DIR) && bun install --no-save
	
	# Listar los archivos en el directorio para verificar
	ls -la $(ARTIFACTS_DIR)/
	
	@echo "✅ Compilación de $(FUNCTION_NAME) completada con éxito!"
