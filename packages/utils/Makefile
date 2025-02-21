build-UtilsLayer:
	# Crear directorio temporal
	rm -rf build-layer
	mkdir -p build-layer/utils
	# Copiar archivos necesarios
	cp -p dist/index.js build-layer/utils/
	cp -p package.json build-layer/utils/
	# Crear zip
	cd build-layer && zip -r ../utils-layer.zip .
	# Limpiar
	rm -rf build-layer
