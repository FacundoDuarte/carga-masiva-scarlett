import Resolver from '@forge/resolver';
import {Queue} from '@forge/events';
import {
  GetIssueKeyPayload,
  GetIssueStatusPayload,
  GetJobsStatusPayload,
  GetUploadUrlPayload,
  Invoice,
  Issue,
  IssueOperationsFromCsvPayload,
  Job,
  JobStatus,
  OperationPayload,
  RequestPayload,
} from '@utils/types';
import {getExistingIssues, requestTicketsJira} from 'utils/functions';
import {CF, CsvRow, CsvRowHeaders, scarlettMapping} from '@utils/custom_fields';
import {storage} from '@forge/api';
import {S3Client, GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import fetch from 'node-fetch';
// import Papa from 'papaparse';

const ISSUE_TYPE = 11871;

const resolver = new Resolver();
const queue = new Queue({key: 'operations-queue'});

const BUCKET_NAME = 'issue-reminder-app-dev-issrem-529202746267';
const client = new S3Client({
  region: 'us-east-1', // asegúrate de que esta sea tu región
  credentials: {
    accessKeyId: 'AKIAXWNXRCON5E6GFRRX',
    secretAccessKey: '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',
  },
});

// resolver.define(
//   'issue-operations-from-csv',
//   async ({payload, context}: {payload: IssueOperationsFromCsvPayload; context: any}) => {
//     return await execute(async () => {
//       const {s3Key, projectId} = payload;
//       return await _handleIssueOperationsFromCsv(s3Key, projectId);
//     });
//   },
// );

// async function _handleIssueOperationsFromCsv(
//   s3Key: string,
//   projectId: number,
// ): Promise<{ticket: Invoice; id: string}[]> {
//   try {
//     const command = new GetObjectCommand({
//       Bucket: BUCKET_NAME,
//       Key: s3Key,
//     });

//     const signedUrl = await getSignedUrl(client, command, {
//       expiresIn: 3600,
//     });
//     const response = await fetch(signedUrl);
//     const csvText = await response.text();

//     // const parsedData = Papa.parse<CsvRow>(csvText, {
//     //   header: true, // Asume que la primera fila es el encabezado
//     //   skipEmptyLines: true,
//     // }).data;

//     const scarlettIds: string[] = parsedData.map((row) => row[CsvRowHeaders.uuid]);
//     console.log(`cantidad de scarlett Ids: ${scarlettIds.length}, `, scarlettIds);
//     const existingIssues = await getExistingIssues(
//       `"Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`,
//       [CF.scarlett_id, CF.summary],
//     );
//     console.log(`existingIssues: ${JSON.stringify(existingIssues)}`);

//     // Remover las filas que tienen '0' en la columna 'uuid'
//     const filteredData = parsedData.filter((row: CsvRow) => row[CsvRowHeaders.uuid] !== '0');

//     // Iterar sobre cada fila filtrada del CSV
//     const results = [];
//     for (const row of filteredData) {
//       const _issueExist = existingIssues.some(
//         (issue) => issue.fields[CF.summary] == row[CsvRowHeaders.uuid],
//       );

//       let ticket: Partial<Issue> = {
//         key: existingIssues?.find((issue) => issue.fields[CF.summary] == row[CsvRowHeaders.uuid])
//           ?.key,
//         fields: {
//           project: {id: projectId},
//           issuetype: {id: ISSUE_TYPE},
//           summary: row[CsvRowHeaders.uuid],
//         },
//       };

//       console.log('Procesando fila:', row);
//       // Iterar sobre el mapeo y asignar valores al ticket
//       for (const [cfField, mapFunction] of Object.entries(scarlettMapping)) {
//         ticket.fields[cfField] = mapFunction(row as CsvRow); // Llama a la función de mapeo
//       }
//       console.log('Ticket después del mapeo:', ticket);
//       // Mantener las propiedades calculadas

//       console.log('Ticket después de calcular método y clave:', ticket);
//       const jobId = await queue.push({
//         ...ticket,
//         method: _issueExist ? 'PUT' : 'POST',
//       } as OperationPayload);
//       console.log('Ticket en la cola:', JSON.stringify(ticket));
//       results.push({
//         ticket: ticket as Invoice,
//         jobId: jobId,
//         id: row[CsvRowHeaders.uuid] as string,
//       });
//     }

//     return results;
//   } catch (error) {
//     console.error('Error al procesar el archivo CSV desde S3:', error);
//     throw new Error('Error al procesar el archivo CSV');
//   }
// }

resolver.define(
  'get-jobs-status',
  async ({payload, context}: {payload: GetJobsStatusPayload; context: any}) => {
    console.log('payload status: ', payload);
    return await execute(async () => {
      return await _getJobsStatus(payload.jobsList);
    });
  },
);

async function _getJobsStatus(jobsList: string[]) {
  const updatedJobs: Job[] = [];

  for (const jobId of jobsList) {
    console.log('consultando jobId: ', jobId);
    const jobStatus = await _getJobStats(jobId);
    updatedJobs.push({
      id: jobId,
      status: jobStatus,
    });
  }
  return updatedJobs;
}

resolver.define(
  'get-issue-key',
  async ({payload, context}: {payload: GetIssueKeyPayload; context: any}) => {
    return await execute(async () => {
      return await _getIssueKey(payload);
    });
  },
);

const _getIssueKey = async (payload: RequestPayload) => await storage.get(`scarlett-${payload.id}`);

resolver.define(
  'get-issue-status',
  async ({payload, context}: {payload: GetIssueStatusPayload; context: any}) => {
    return await execute(async () => {
      return await _getIssueStatus(payload);
    });
  },
);

async function _getIssueStatus(payload: GetIssueStatusPayload) {
  const formattedQuery = `key in (${payload.issueKeys.map((id) => `"${id}"`).join(', ')})`;
  const issues = (await getExistingIssues(formattedQuery, [CF.status])) ?? [];
  return (
    issues.map((issue) => ({
      key: issue.key,
      fields: {
        status: issue.fields.status,
      },
    })) ?? []
  );
}

resolver.define(
  'download-template',
  async ({payload, context}: {payload: RequestPayload; context: any}) => {
    return await execute(async () => {
      return await _downloadTemplate();
    });
  },
);

async function _downloadTemplate() {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: 'Carga Masiva_Master File Enero.xlsx',
  });
  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
  });
  return signedUrl;
}

resolver.define(
  'get-upload-url',
  async ({payload, context}: {payload: GetUploadUrlPayload; context: any}) => {
    return await execute(async () => {
      return await _getUploadUrl(payload);
    });
  },
);

async function _getUploadUrl(payload: GetUploadUrlPayload) {
  const objectKey = `uploads/${Date.now()}-${payload.fileName}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
  });
  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
  });
  console.log(`objectKey:${objectKey},signedUrl: ${signedUrl}`);
  return {signedUrl, s3Key: objectKey};
}

resolver.define(
  'operations-queue-listener',
  async ({payload, context}: {payload: OperationPayload; context: any}) => {
    console.log(`Llegó el ticket a la cola: ${JSON.stringify(payload)}`);

    const ticket = await requestTicketsJira(payload);
    if (payload.method != 'PUT') {
      console.log(`[Storage] Guardando ticket key ${ticket?.key} para job ${context.jobId}`);
      await storage.set(`scarlett-${context.jobId}`, ticket?.key);
      console.log(`[Storage] Ticket key guardado exitosamente para job ${context.jobId}`);
    }
  },
);

async function _getJobStats(jobId: string): Promise<JobStatus> {
  const request = await queue.getJob(jobId).getStats();
  const statusList = await request.json();

  if (statusList.inProgress === 1) {
    return JobStatus.inProgress;
  } else if (statusList.success === 1) {
    return JobStatus.success;
  } else if (statusList.failed === 1) {
    return JobStatus.failed;
  }

  throw new Error('Estado del trabajo no reconocido');
}

// Modificar la función execute para manejar mejor los casos donde jobId podría ser undefined
async function execute<T>(operation: () => Promise<T>): Promise<T> {
  console.log('Operation name:', operation.name);
  try {
    return await operation();
  } catch (error) {
    console.error('Error en la operación:', error);
  }
}

export const handler: ReturnType<typeof resolver.getDefinitions> = resolver.getDefinitions();
