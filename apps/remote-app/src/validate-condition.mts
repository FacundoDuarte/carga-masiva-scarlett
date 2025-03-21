import {JiraClient, Issue, OperationPayload} from '/opt/utils/index.js';

const ISSUE_TYPE_ID = 11504;

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
    const payload = await request.json();
    console.log('Request body:', payload);
    const {
      Items: operations,
      BatchInput: {apiBaseUrl, forgeToken, projectId},
    } = payload.event;

    if (!operations.length) {
      console.info('No hay operaciones para procesar');
      return new Response(
        JSON.stringify({Items: [], BatchInput: {apiBaseUrl, forgeToken, projectId}}),
        {status: 204},
      );
    }

    // Validación de que tenemos los datos esenciales
    if (!operations || !Array.isArray(operations)) {
      console.error('No se recibieron issues o el formato es incorrecto');
      throw new Error(
        'No se recibieron issues o el formato es incorrecto. Datos recibidos: ' +
          JSON.stringify(payload),
      );
    }

    // Validaciones básicas
    if (!forgeToken || forgeToken === '' || !apiBaseUrl || apiBaseUrl === '') {
      console.error('Authorization or API Base URL header is required');
      throw {
        type: 'Lambda.BadRequestException',
        status: 400,
        message: 'Authorization or API Base URL header is required',
      };
    }
    const client = new JiraClient(forgeToken, apiBaseUrl);

    const validationJql = [
      `status in ('Pending Proveedor',"En Curso Agente Recepciones",'En Analisis Comercial',"En curso In stock",'En analisis inbound Ops','Approval Comercial','Approval F&C')`,
      `status = DONE AND cf[21010] = 'Factura Duplicada'`,
    ];

    const validOperations = await validateConditions(operations, client, validationJql);
    console.log('Valid operations:', validOperations);
    console.log('Valid operations length:', validOperations.length);

    // Estructura correcta que espera el Map "Execute Operations"
    // Es importante mantener Items en el nivel superior del objeto
    const responsePayload = {
      Items: validOperations.map((op) => ({
        // La estructura debe ser exactamente como la espera execute-operation.mts
        // Estructura de "event" que espera execute-operation.mts:
        operation: {
          issue: op.issue,
          method: op.method,
          change: op.change,
        },
        client: {
          token: forgeToken,
          apiBaseUrl: apiBaseUrl,
        },
      })),
    };

    console.log(
      'Ejemplo de primer item en payload:',
      responsePayload.Items.length > 0
        ? JSON.stringify(responsePayload.Items[0], null, 2)
        : 'No hay items',
    );

    console.log(
      'Sending response payload with structure:',
      JSON.stringify(responsePayload, null, 2),
    );

    return new Response(JSON.stringify(responsePayload), {status: 200});
  } catch (error: any) {
    console.error('Error al procesar las filas:', error);
    const noItemsError = {
      errorType: 'Lambda.NoItemsToProcess',
      errorMessage: 'No hay filas para procesar',
    };
    console.log('===== LANZANDO ERROR NO ROWS TO PROCESS =====');
    console.log('Contenido del error NoRows:', JSON.stringify(noItemsError));
    throw noItemsError;
  }
}

async function validateConditions(
  issues: OperationPayload[],
  client: JiraClient,
  validationJql: string[],
): Promise<OperationPayload[]> {
  //Me traigo las operaciones que tienen change.type = update o transition
  const mustCheck = issues.filter((op) => op.issue.id !== undefined);
  console.log(`Must check: ${JSON.stringify(mustCheck)}`);
  if (!mustCheck || mustCheck.length === 0) {
    return issues;
  }
  const noAplican = await client.validateIssues(
    mustCheck.map((op) => op.issue.id!),
    validationJql,
  );
  const validIssues = issues.filter((op) => !noAplican.includes(op.issue.id!));
  return validIssues;
}
