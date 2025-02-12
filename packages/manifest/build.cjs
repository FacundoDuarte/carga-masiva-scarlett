#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Función para cargar variables de entorno de múltiples archivos .env
function loadEnvFiles() {
    const envVars = {};
    
    // Cargar variables del .env en packages/manifest
    const manifestEnvPath = path.join(__dirname, '.env');
    if (fs.existsSync(manifestEnvPath)) {
        Object.assign(envVars, dotenv.parse(fs.readFileSync(manifestEnvPath)));
    }
    
    // Cargar variables del .env en apps/remote-app
    const remoteAppEnvPath = path.join(__dirname, '../../apps/remote-app/.env');
    if (fs.existsSync(remoteAppEnvPath)) {
        Object.assign(envVars, dotenv.parse(fs.readFileSync(remoteAppEnvPath)));
    }
    
    return envVars;
}

// Función para reemplazar placeholders en el contenido
function replacePlaceholders(content, envVars) {
    let modifiedContent = content;
    
    // Buscar todos los placeholders con el formato {{VARIABLE}}
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    
    modifiedContent = modifiedContent.replace(placeholderRegex, (match, placeholder) => {
        const value = envVars[placeholder];
        if (!value) {
            console.warn(`Warning: No se encontró valor para el placeholder ${placeholder}`);
            return match; // Mantener el placeholder original si no se encuentra valor
        }
        return value;
    });
    
    return modifiedContent;
}

// Función principal
function main() {
    try {
        // Cargar variables de entorno
        const envVars = loadEnvFiles();
        
        // Leer el archivo template.yml
        const templatePath = path.join(__dirname, 'template.yml');
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        // Reemplazar placeholders
        const processedContent = replacePlaceholders(templateContent, envVars);
        
        // Escribir el resultado en manifest.yml
        const outputPath = path.join(__dirname, '../../apps/forge-app/manifest.yml');
        fs.writeFileSync(outputPath, processedContent);
        
        console.log('Manifest generado exitosamente en apps/forge-app/manifest.yml');
    } catch (error) {
        console.error('Error al generar el manifest:', error);
        process.exit(1);
    }
}

main();
