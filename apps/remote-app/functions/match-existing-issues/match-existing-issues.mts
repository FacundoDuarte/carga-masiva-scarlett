import {
  statusMapping,
  StatusName,
  ValidStatusType,
  ValidStatusNames,
  JiraClient,
  CF,
  CsvRow,
  Issue,
  CsvRowHeaders,
  OperationPayload,
  scarlettMapping,
} from '/opt/utils/index';

const ISSUE_TYPE_ID = 11504;

// Función principal que organiza el flujo
export default async function post(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {status: 405});
    }

    // Parse request body
    const payload = await request.json();
    console.log('Request body:', JSON.stringify(payload));
    const {
      event: {
        Items: rows,
        BatchInput: {executionId, projectId, apiBaseUrl, forgeToken},
      },
    } = payload;

    if (!rows.length) {
      console.info('No hay filas para procesar');
      return new Response(
        JSON.stringify({Items: [], BatchInput: {executionId, projectId, apiBaseUrl, forgeToken}}),
        {status: 204},
      );
    }

    // Validaciones básicas
    if (!forgeToken || forgeToken === '') {
      console.error('Authorization header is required');
      return new Response('Authorization header is required', {status: 400});
    }
    // 2. Crear cliente y obtener issues existentes
    const client = new JiraClient(forgeToken, apiBaseUrl);
    const {operations} = await matchExistingIssues(rows, projectId, client);

    // Preservamos la estructura completa, incluyendo BatchInput que es necesario para ValidateCondition
    console.log('Operations:', operations);
    console.log('Operations length:', operations.length);

    return new Response(
      JSON.stringify({
        Items: operations,
        BatchInput: {
          executionId,
          projectId,
          apiBaseUrl,
          forgeToken,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error processing request:', error);
    throw error;
  }

  // 2. Función matchExistingIssues: Obtener y preparar los issues
  async function matchExistingIssues(
    rows: CsvRow[],
    projectId: number,
    client: JiraClient,
  ): Promise<{operations: OperationPayload[]}> {
    // Lógica para obtener issues existentes y crear operaciones
    const scarlettIds: string[] = rows.map((row) => row[CsvRowHeaders.uuid] as string);

    console.log(`Cantidad de scarlett Ids: ${scarlettIds.length}`, scarlettIds);

    const existingIssues = await client.getExistingIssues(
      `project = ${projectId} AND "Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`,
      [CF.scarlett_id, CF.summary, CF.status, 'id'],
    );

    const issuesIds: number[] = existingIssues.map((issue) => issue.id!);
    console.log('Existing issues:', existingIssues);

    const operations: OperationPayload[] = [];

    for (const row of rows) {
      const existingIssue = existingIssues.find((issue) =>
        (issue.fields[CF.scarlett_id] as string[]).includes(row[CsvRowHeaders.uuid]),
      );

      const {key, fields, id} = existingIssue ?? {
        key: undefined,
        fields: {status: {name: StatusName.Default}},
        id: undefined,
      };
      const issue: Partial<Issue> = {
        key,
        id,
        fields: {
          project: {id: projectId},
          summary: row[CsvRowHeaders.uuid],
          issuetype: {id: ISSUE_TYPE_ID},
        },
      };

      for (const [cfField, mapFunction] of Object.entries(scarlettMapping)) {
        const value = mapFunction(row);
        if (value !== undefined) {
          (issue.fields as any)[cfField] = value;
        }
      }

      const transitionId = checkTransitionAvailable(
        fields[CF.status]?.name,
        row[CsvRowHeaders.estadoEnJira],
        statusMapping,
      );

      operations.push({
        issue,
        method: key ? 'PUT' : 'POST',
        change: {
          type: key ? 'update' : 'create',
          transitionId,
        },
      });

      console.log('Transition ID:', transitionId);
      if (transitionId !== undefined && key) {
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
    return {operations};
  }

  // Funciones auxiliares (mantener igual)
  function checkTransitionAvailable(
    fromState: string | undefined,
    toState: string,
    statusMapping: Record<ValidStatusType, number>,
  ): number | undefined {
    let to = toState.toLocaleLowerCase() as ValidStatusType;
    let from = fromState?.toLocaleLowerCase() as ValidStatusType;
    if (!isValidStatus(to) || (from && !isValidStatus(from))) {
      throw new Error(
        `Status ${from} (${isValidStatus(from ?? '')}) or ${to} (${isValidStatus(
          to,
        )}) are not valid`,
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
}
