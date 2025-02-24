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

const ISSUE_TYPE_ID = 11871;

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
      event: {
        Items: rowsRaw,
        BatchInput: {executionId, projectId, apiBaseUrl, forgeToken},
      },
    } = payload;

    let rows = rowsRaw.map((row: Record<string, string>) => {
      const [
        pais,
        uuid,
        documentType,
        estadoDeValidaciones,
        proveedor,
        proveedorId,
        fechaDeRecepcion,
        asignacionSapSku,
        estadoIntegracionSapFinal,
        estadoDeConciliacion,
        estadoDeLasSolicitudes,
        ordenDeCompra,
        fechaDeEmision,
        numeroDeEnvio,
        estadoDeEnvio,
        monto,
        estadoSap,
        estadoEnJira,
        subEstadoEnJira,
      ] = Object.values(row)[0].split(';');
      return {
        [CsvRowHeaders.pais]: pais,
        [CsvRowHeaders.uuid]: uuid,
        [CsvRowHeaders.documentType]: documentType,
        [CsvRowHeaders.estadoDeValidaciones]: estadoDeValidaciones,
        [CsvRowHeaders.proveedor]: proveedor,
        [CsvRowHeaders.proveedorId]: proveedorId,
        [CsvRowHeaders.fechaDeRecepcion]: fechaDeRecepcion,
        [CsvRowHeaders.asignacionSapSku]: asignacionSapSku,
        [CsvRowHeaders.estadoDeConciliacion]: estadoDeConciliacion,
        [CsvRowHeaders.estadoDeLasSolicitudes]: estadoDeLasSolicitudes,
        [CsvRowHeaders.ordenDeCompra]: ordenDeCompra,
        [CsvRowHeaders.fechaDeEmision]: fechaDeEmision,
        [CsvRowHeaders.numeroDeEnvio]: numeroDeEnvio,
        [CsvRowHeaders.estadoDeEnvio]: estadoDeEnvio,
        [CsvRowHeaders.monto]: monto,
        [CsvRowHeaders.estadoIntegracionSapFinal]: estadoSap,
        [CsvRowHeaders.estadoEnJira]: estadoEnJira,
        [CsvRowHeaders.subEstadoEnJira]: subEstadoEnJira,
      };
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

    rows = rows.filter((row: Record<CsvRowHeaders, string>) => row[CsvRowHeaders.uuid] !== '0');
    if (!rows.length) {
      console.error('All rows have uuid 0');
      return new Response('All rows have uuid 0', {status: 200});
    }
    const scarlettIds: string[] = rows.map((row) => row[CsvRowHeaders.uuid] as string);

    console.log(`Cantidad de scarlett Ids: ${scarlettIds.length}`, scarlettIds);

    const client = new JiraClient(forgeToken, apiBaseUrl);
    const existingIssues = await client.getExistingIssues(
      `"Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`,
      [CF.scarlett_id, CF.summary, CF.status],
    );
    console.log('Existing issues:', existingIssues);

    const operations: OperationPayload[] = [];
    for (const row of rows) {
      const existingIssue = existingIssues.find((issue) =>
        (issue.fields[CF.scarlett_id] as string[]).includes(row[CsvRowHeaders.uuid]),
      );
      const {
        key,
        fields: {[CF.summary]: summary, [CF.status]: status},
      } = existingIssue ?? {
        key: undefined,
        fields: {
          summary: row[CsvRowHeaders.uuid],
          status: {name: StatusName.AprovacaoCompliance as string},
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
        (issue.fields as any)[cfField] = mapFunction(row);
      }
      // Check if a transition is needed
      let transitionId = checkTransitionAvailable(status?.name, row[CsvRowHeaders.estadoEnJira]);

      operations.push({
        issue,
        method: key ? 'PUT' : 'POST',
        change: {
          type: key ? 'update' : 'create',
          transitionId,
        },
      });
    }

    return new Response(
      JSON.stringify([...operations.map((operation) => ({operation, forgeToken, apiBaseUrl}))]),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(`Error processing request: ${error}`, {status: 500});
  }
}

function checkTransitionAvailable(
  fromState: string | undefined,
  toState: string,
): number | undefined {
  if (!isValidStatus(toState) || (fromState && !isValidStatus(fromState))) {
    throw new Error(
      `Status ${fromState} (${
        fromState ? isValidStatus(fromState) : 'not defined'
      }) or ${toState} (${isValidStatus(toState)}) are not valid`,
    );
  }
  //retorno vacio si el fromState es el mismo que toState
  if (fromState && fromState === toState) return;
  return statusMapping[toState];
}

//Necesito crearme en typescript una función auxiliar que reciba un string y me permita validar que es parte del enumerado StatusName
function isValidStatus(status: string): status is ValidStatusType {
  return Object.values(ValidStatusNames).includes(status as ValidStatusType);
}
