import {
  statusMapping,
  StatusName,
  ValidStatusType,
  ValidStatusNames,
  JiraClient,
  CF,
  CsvRow,
  CsvRowHeaders,
  Issue,
  scarlettMapping,
  OperationPayload,
} from '/opt/utils/index.js';

const ISSUE_TYPE_ID = 11504;

// Fixed delimiter for CSV parsing
const DELIMITER = ';';
//REVISAR La lógica de este postv1
export default async function postv1(request: Request): Promise<Response> {
  try {
    // Log request details
    console.log('=== REQUEST DETAILS ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Method:', request.method);

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {status: 405});
    }

    // Parse request body
    const payload = await request.json();
    console.log('Request body:', payload);
    const {
      event: {
        Items: rowsRaw,
        BatchInput: {executionId, projectId, apiBaseUrl, forgeToken},
      },
    } = payload;

    // Default to semicolon delimiter since we know the data uses it
    const delimiter = DELIMITER;
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
        console.log('===== LANZANDO ERROR NO ROWS TO PROCESS =====');
        console.log('EMPTY_ERROR: No hay filas para procesar');
        console.log('Contenido del error NoRows:', JSON.stringify(noItemsError));
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
      console.log('===== LANZANDO ERROR INVALID FORMAT =====');
      console.log('EMPTY_ERROR: rowsRaw no es un array u objeto válido');
      console.log('Contenido del error InvalidFormat:', JSON.stringify(invalidFormatError));
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
    if (!forgeToken || forgeToken === '') {
      console.error('Authorization header is required');
      return new Response('Authorization header is required', {status: 400});
    }
    if (!rows || !Array.isArray(rows)) {
      console.error(
        'Invalid request body: Items array is required',
        `Items: ${rows}, Items type: ${typeof rows}`,
      );
      return new Response('Invalid request body: Items array is required', {status: 400});
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
    const scarlettIds: string[] = rows.map((row) => row[CsvRowHeaders.uuid] as string);

    console.log(`Cantidad de scarlett Ids: ${scarlettIds.length}`, scarlettIds);

    const client = new JiraClient(forgeToken, apiBaseUrl);
    const existingIssues = await client.getExistingIssues(
      `project = ${projectId} AND "Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`,
      [CF.scarlett_id, CF.summary, CF.status, 'id'],
    );

    const issuesIds: number[] = existingIssues.map((issue) => issue.id!);
    console.log('Existing issues:', existingIssues);

    const operations: OperationPayload[] = [];

    const validationJql = [
      `status in ('Pending Proveedor',"En Curso Agente Recepciones",'En Analisis Comercial',"En curso In stock",'En analisis inbound Ops','Approval Comercial','Approval F&C')`,
      `status = DONE AND cf[21010] = 'Factura Duplicada'`,
    ];

    const noAplican =
      issuesIds && issuesIds.length > 0
        ? await client.validateIssues(issuesIds, validationJql)
        : [];
    console.log('No aplican:', noAplican);

    for (const row of rows) {
      const existingIssue = existingIssues.find((issue) =>
        (issue.fields[CF.scarlett_id] as string[]).includes(row[CsvRowHeaders.uuid]),
      );
      if (existingIssue && noAplican.includes(existingIssue.id!)) {
        continue;
      }
      const {
        key,
        fields: {[CF.summary]: summary, [CF.status]: status},
      } = existingIssue ?? {
        key: undefined,
        fields: {
          summary: row[CsvRowHeaders.uuid],
          status: {name: StatusName.Abierto as string},
        },
      };
      // Create base issue structure
      const issue: Partial<Issue> = {
        key,
        fields: {
          project: {id: projectId},
          summary,
          issuetype: {id: ISSUE_TYPE_ID},
        },
      };
      for (const [cfField, mapFunction] of Object.entries(scarlettMapping)) {
        const value = mapFunction(row);
        // Es importante verificar que el valor no sea undefined para evitar agregarlo al cuerpo de la llamada.
        // El valor puede ser booleano, por lo que es necesario explicitamente verificar que no sea undefined
        if (value !== undefined) {
          (issue.fields as any)[cfField] = value;
        }
      }
      // Check if a transition is needed
      let transitionId = checkTransitionAvailable(
        status?.name,
        row[CsvRowHeaders.estadoEnJira],
        statusMapping,
      );

      operations.push({
        issue,
        method: key ? 'PUT' : 'POST',
        change: {
          type: key ? 'update' : 'create',
        },
      });
      if (transitionId) {
        operations.push({
          issue,
          method: 'POST',
          change: {
            type: 'transition',
            transitionId,
          },
        });
      }
    }
    console.log('Operations:', operations);
    if (!operations.length) {
      const noItemsError = {
        errorType: 'Lambda.NoItemsToProcess',
        errorMessage: 'No hay operaciones para procesar',
      };
      console.log('===== LANZANDO ERROR NO OPERATIONS =====');
      console.log('Contenido del error NoOperations:', JSON.stringify(noItemsError));
      throw noItemsError;
    }

    const responseData = {
      Items: [...operations.map((operation) => ({operation, forgeToken, apiBaseUrl}))],
    };

    console.log('===== FINALIZANDO EJECUCION NORMAL =====');
    console.log('Respuesta que se enviara a Step Functions:', JSON.stringify(responseData));

    if (!responseData.Items || responseData.Items.length === 0) {
      console.log('EMPTY_ERROR: Items es un array vacio');
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error processing request:', error);

    // Verificar si es un error que ya tiene la estructura correcta (errorType ya está definido)
    if (error.errorType) {
      console.log('===== LANZANDO ERROR PREFORMATEADO =====');
      console.log(`Propagando error preformateado: ${error.errorType}`);
      console.log('Contenido del error:', JSON.stringify(error));
      throw error; // Propagar directamente si ya tiene formato adecuado
    }

    // Verificar si es un error de límite de tasa (429) o servicio no disponible (503)
    if (error.status === 429) {
      // Propagar el error para que la máquina de estados lo capture correctamente
      console.log(`Propagando error 429 con retryAfterSeconds=${error.retryAfterSeconds || 60}`);

      // Lanzar un error con formato que la máquina de estados pueda interpretar
      const rateError = {
        errorType: 'Lambda.TooManyRequestsException',
        errorMessage: error.message || 'Rate limit exceeded',
        retryAfterSeconds: error.retryAfterSeconds || 60,
      };
      console.log('===== LANZANDO ERROR 429 =====');
      console.log('Contenido del error 429:', JSON.stringify(rateError));
      throw rateError;
    } else if (error.status === 503) {
      // Propagar el error para que la máquina de estados lo capture correctamente
      console.log(`Propagando error 503 con retryAfterSeconds=60`);

      // Lanzar un error con formato que la máquina de estados pueda interpretar
      const serviceError = {
        errorType: 'Lambda.ServiceUnavailable',
        errorMessage: error.message || 'Service unavailable',
        retryAfterSeconds: 60,
      };
      console.log('===== LANZANDO ERROR 503 =====');
      console.log('Contenido del error 503:', JSON.stringify(serviceError));
      throw serviceError;
    } else {
      // Para cualquier otro error, también lanzar una excepción con un formato que la máquina de estados pueda manejar
      console.log('===== LANZANDO ERROR NATIVO =====');
      console.log(`Propagando error nativo: ${error.message || error}`);
      console.log('Tipo de error:', typeof error);
      console.log('Stack trace:', error.stack);

      // Si el error es null o undefined, agregar log específico
      if (!error) {
        console.log('EMPTY_ERROR: Error es null o undefined');
      }

      throw error; // Propagar el error original sin transformarlo
    }
  }
}

function checkTransitionAvailable(
  fromState: string | undefined,
  toState: string,
  statusMapping: Record<ValidStatusType, number>,
): number | undefined {
  let to = toState.toLocaleLowerCase() as ValidStatusType;
  let from = fromState?.toLocaleLowerCase() as ValidStatusType;
  if (!isValidStatus(to) || (from && !isValidStatus(from))) {
    throw new Error(
      `Status ${from} (${isValidStatus(from ?? '')}) or ${to} (${isValidStatus(to)}) are not valid`,
    );
  }
  console.log('fromState:', fromState);
  console.log('toState:', toState);
  //retorno undefined si el fromState es el mismo que toState
  if (!fromState || from === to) return undefined;
  return statusMapping[to];
}

function isValidStatus(status: string): status is ValidStatusType {
  return Object.values(ValidStatusNames).includes(status.toLocaleLowerCase() as ValidStatusType);
}
