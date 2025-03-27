import {S3Client} from 'bun';

const client = new S3Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  bucket: 'scarlet-operations-dev-storage',
});
/**
 * Detecta si un archivo CSV usa punto y coma (";") o coma (",") como delimitador.
 * Lee las primeras líneas del archivo para hacer la detección.
 */
export const handler = async (event: {
  forgeToken: string;
  projectId: string;
  executionId: string;
  bucketName: string;
  filePath: string;
  apiBaseUrl: string;
}): Promise<{
  csvDelimiter: string;
}> => {
  const {forgeToken, projectId, filePath, executionId, bucketName, apiBaseUrl} = event;

  try {
    // Obtenemos una muestra del archivo (primeros 4KB son suficientes)
    const file = client.file(filePath);
    const sampleContent = await file.text();

    // Dividimos el contenido en líneas
    const lines = sampleContent.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      throw new Error('El archivo CSV está vacío o no contiene líneas válidas');
    }

    // Tomamos la primera línea (encabezados) para el análisis
    const headerLine = lines[0];

    // Contamos ocurrencias de cada delimitador
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;

    // Analizamos también una línea de datos si está disponible
    let dataLineDelimiter = '';
    if (lines.length > 1) {
      const dataLine = lines[1];
      const dataLineSemicolonCount = (dataLine.match(/;/g) || []).length;
      const dataLineCommaCount = (dataLine.match(/,/g) || []).length;

      // Si la línea de datos tiene un delimitador claro, lo usamos
      if (dataLineSemicolonCount > dataLineCommaCount) {
        dataLineDelimiter = 'SEMICOLON';
      } else if (dataLineCommaCount > dataLineSemicolonCount) {
        dataLineDelimiter = 'COMMA';
      }
    }

    // Determinamos el delimitador basado en el recuento
    let delimiter: string;

    // Primero consideramos el delimitador de la línea de datos si está disponible
    if (dataLineDelimiter) {
      delimiter = dataLineDelimiter;
    } else if (semicolonCount > commaCount) {
      delimiter = 'SEMICOLON';
    } else if (commaCount > semicolonCount) {
      delimiter = 'COMMA';
    } else {
      // Si no podemos determinar, usamos punto y coma por defecto (parece ser el estándar en este proyecto)
      delimiter = 'SEMICOLON';
    }

    console.log(
      `Delimitador detectado: ${delimiter} (semicolons: ${semicolonCount}, commas: ${commaCount})`,
    );

    return {
      csvDelimiter: delimiter,
    };
  } catch (error) {
    console.error('Error al detectar el delimitador CSV:', error);
    throw error;
  }
};
