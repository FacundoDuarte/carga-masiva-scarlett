import {CsvRow, CsvRowHeaders} from '/opt/utils/index.js';

const ISSUE_TYPE_ID = 11504;

// Fixed delimiter for CSV parsing
const DELIMITER = ';';

async function parsingRows(rowsRaw: any, delimiter: string = DELIMITER): Promise<CsvRow[]> {
  try {
    // Handle case where rowsRaw is an object instead of an array
    // This happens when CSV is parsed incorrectly with header as key and row as value
    let processedRows: any[] = [];

    if (typeof rowsRaw === 'object' && rowsRaw !== null) {
      console.log('rowsRaw is an object, trying to convert to array');
      // Convert object to array of values
      processedRows = Object.values(rowsRaw);
      if (processedRows.length === 0) {
        console.error('rowsRaw is an empty object');
        const noItemsError = {
          errorType: 'Lambda.NoItemsToProcess',
          errorMessage: 'No hay filas para procesar',
        };
        throw noItemsError;
      }
      console.log('Converted rowsRaw to array:', processedRows);

      // Extract string values from objects and clean them
      // The objects look like: { "header": "value" }
      processedRows = processedRows.map((obj) => {
        if (typeof obj === 'object' && obj !== null) {
          // Get the first value from the object (the CSV row)
          const firstValue = Object.values(obj)[0];
          if (typeof firstValue === 'string') {
            // If the key contains the headers and the value contains the data
            // we need to extract just the data part
            const key = Object.keys(obj)[0];
            if (key && key.includes(';') && firstValue.includes(';')) {
              // The key is the header row, and the value is the data row
              return firstValue;
            }
            return firstValue;
          }
        }
        return '';
      });

      console.log('Extracted string values from objects:', processedRows);
    } else if (Array.isArray(rowsRaw)) {
      processedRows = rowsRaw;
    } else {
      console.error('rowsRaw is not an array or object:', rowsRaw);
      const invalidFormatError = {
        errorType: 'Lambda.NoItemsToProcess',
        errorMessage: 'rowsRaw no es un array u objeto válido',
      };
      throw invalidFormatError;
    }

    let rows = processedRows.map((rowRaw: any) => {
      // Check if rowRaw is a string
      if (typeof rowRaw !== 'string') {
        console.error('rowRaw is not a string:', rowRaw);
        // Return a default empty row to avoid breaking the map function
        return {} as CsvRow;
      }

      // Define expected headers in order
      const expectedHeaders = [
        CsvRowHeaders.pais,
        CsvRowHeaders.uuid,
        CsvRowHeaders.documentType,
        CsvRowHeaders.estadoDeValidaciones,
        CsvRowHeaders.proveedor,
        CsvRowHeaders.proveedorId,
        CsvRowHeaders.fechaDeRecepcion,
        CsvRowHeaders.asignacionSapSku,
        CsvRowHeaders.estadoIntegracionSap,
        CsvRowHeaders.estadoDeConciliacion,
        CsvRowHeaders.estadoDeLasSolicitudes,
        CsvRowHeaders.ordenDeCompra,
        CsvRowHeaders.fechaDeEmision,
        CsvRowHeaders.numeroDeEnvio,
        CsvRowHeaders.estadoDeEnvio,
        CsvRowHeaders.monto,
        CsvRowHeaders.estadoSap, // estadoSap
        CsvRowHeaders.estadoEnJira,
        CsvRowHeaders.subEstadoEnJira,
      ];

      // Process the row regardless of content - we know it's a semicolon-delimited string
      // Count the number of delimiters to verify it's a valid CSV row
      const delimiterCount = (
        rowRaw.match(new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []
      ).length;

      // A valid row should have at least a few delimiters
      if (delimiterCount > 5) {
        console.log('Processing CSV row with', delimiterCount + 1, 'fields');

        // Implementación más robusta para manejar delimitadores en CSV
        // que considera valores que podrían contener comas
        let values: string[] = [];
        let currentField = '';
        let i = 0;

        // Función para dividir la cadena manualmente, preservando comas dentro de los valores
        while (i < rowRaw.length) {
          // Si encontramos el delimitador, agregamos el campo actual a los valores
          if (rowRaw.substring(i, i + delimiter.length) === delimiter) {
            values.push(currentField.trim());
            currentField = '';
            i += delimiter.length;
          } else {
            // De lo contrario, agregamos el carácter al campo actual
            currentField += rowRaw[i];
            i++;
          }
        }
        // Agregamos el último campo
        values.push(currentField.trim());

        console.log('Campos procesados:', values);

        // Create the row object dynamically
        const row: Record<string, string> = {};

        // Map each value to its corresponding header
        expectedHeaders.forEach((header, index) => {
          // Use empty string if value is undefined
          row[header] = index < values.length ? values[index] : '';
        });

        return row as CsvRow;
      }

      // If we get here, the row is not in the expected format
      console.error('Row is not in the expected format:', rowRaw);
      return {} as CsvRow;
    }) as CsvRow[];

    console.log('Rows:', rows);

    if (!rows || !Array.isArray(rows)) {
      console.error(
        'Invalid request body: Items array is required',
        `Items: ${rows}, Items type: ${typeof rows}`,
      );
      throw new Error('Invalid request body: Items array is required');
    }

    // Filter out rows that are empty or have 'No aplica' in subEstadoEnJira
    rows = rows.filter((row: Record<CsvRowHeaders, string>) => {
      // Check if row is an empty object (from our error handling above)
      if (!row || Object.keys(row).length === 0) {
        return false;
      }
      // Check if the required field exists and is not 'No aplica'
      return row[CsvRowHeaders.subEstadoEnJira] !== 'No aplica';
    });
    if (!rows.length) {
      console.error('All rows have uuid 0 o no aplica');
      const noItemsError = {
        errorType: 'Lambda.NoItemsToProcess',
        errorMessage: 'Todas las filas tienen uuid 0 o no aplica',
      };
      console.log('===== LANZANDO ERROR NO VALID ROWS =====');
      console.log('Contenido del error NoValidRows:', JSON.stringify(noItemsError));
      throw noItemsError;
    }
    return rows;
  } catch (error) {
    console.error('Error al procesar las filas:', error);
    throw error;
  }
}

// Función principal que organiza el flujo
export default async function post(request: Request): Promise<Response> {
  try {
    // Log request details
    console.log('=== REQUEST DETAILS ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Method:', request.method);

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {status: 405});
    }

    // Parse request body
    const payload: {
      event: {
        Items: any[];
        BatchInput: {
          executionId: string;
          projectId: number;
          apiBaseUrl: string;
          forgeToken: string;
        };
      };
    } = await request.json();
    console.log('Request body:', payload);
    const {
      event: {
        Items: rowsRaw,
        BatchInput: {executionId, projectId, apiBaseUrl, forgeToken},
      },
    } = payload;

    // Validaciones básicas
    if (!forgeToken || forgeToken === '') {
      console.error('Authorization header is required');
      return new Response('Authorization header is required', {status: 400});
    }

    // 1. Procesar rows
    const rows = await parsingRows(rowsRaw);
    if (!rows.length) {
      console.error('All rows have uuid 0 o no aplica');
      const noItemsError = {
        errorType: 'Lambda.NoItemsToProcess',
        errorMessage: 'Todas las filas tienen uuid 0 o no aplica',
      };
      console.log('===== LANZANDO ERROR NO VALID ROWS =====');
      console.log('Contenido del error NoValidRows:', JSON.stringify(noItemsError));
      throw noItemsError;
    }
    return new Response(
      JSON.stringify({Items: rows, BatchInput: {executionId, projectId, apiBaseUrl, forgeToken}}),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    // [Código actual de manejo de errores]
    // Este código debe mantenerse igual para gestionar todos los tipos de errores,
    // especialmente los errores 429 (TooManyRequestsException)
    console.error('Error al procesar las filas:', error);
    throw error;
  }
}
