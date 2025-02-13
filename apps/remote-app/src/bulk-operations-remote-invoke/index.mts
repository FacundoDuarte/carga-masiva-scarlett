// import {APIGatewayProxyEvent, APIGatewayProxyResult, Handler} from 'aws-lambda';
// // import {Queue} from '@forge/events';
// import {
//   GetIssueKeyPayload,
//   GetIssueStatusPayload,
//   GetJobsStatusPayload,
//   GetUploadUrlPayload,
//   Invoice,
//   Issue,
//   IssueOperationsFromCsvPayload,
//   Job,
//   JobStatus,
//   OperationPayload,
//   RequestPayload,
// } from 'utils/types';
// import {getExistingIssues, requestTicketsJira} from 'utils/functions';
// import {CF, CsvRow, CsvRowHeaders, scarlettMapping} from 'utils/custom_fields';
// import {storage} from '@forge/api';
// import {S3Client, GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
// import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
// import fetch from 'node-fetch';
// import Papa from 'papaparse';

// const ISSUE_TYPE = 11871;

// // const queue = new Queue({key: 'operations-queue'});

// const BUCKET_NAME = 'issue-reminder-app-dev-issrem-529202746267';
// const client = new S3Client({
//   // region: 'us-east-1', // asegúrate de que esta sea tu región
//   // credentials: {
//   //   accessKeyId: 'AKIAXWNXRCON5E6GFRRX',
//   //   secretAccessKey: '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',
//   // },
// });

// // resolver.define(
// //   'issue-operations-from-csv',
// //   async ({payload, context}: {payload: IssueOperationsFromCsvPayload; context: any}) => {
// //     return await execute(async () => {
// //       const {s3Key, projectId} = payload;
// //       return await _handleIssueOperationsFromCsv(s3Key, projectId);
// //     });
// //   },
// // );

// export const lambdaHandler: Handler = async (event): Promise<{operationId: string}> => {
//   const {s3Key, projectId} = event.payload;
//   const operationId = await invokeOperationsFromCsv(s3Key, projectId);
//   return {operationId};
// };

// async function invokeOperationsFromCsv(s3Key: string, projectId: number): Promise<string> {
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

//     const parsedData = Papa.parse<CsvRow>(csvText, {
//       header: true, // Asume que la primera fila es el encabezado
//       skipEmptyLines: true,
//     }).data;

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
//     for (const row of filteredData) {
//       const _issueExist = existingIssues.some(
//         (issue) => issue.fields[CF.summary] == row[CsvRowHeaders.uuid],
//       );

//       let ticket: Issue = {
//         key: existingIssues?.find((issue) => issue.fields[CF.summary] == row[CsvRowHeaders.uuid])
//           ?.key,
//         fields: {
//           project: {id: projectId},
//           issuetype: {id: ISSUE_TYPE},
//           summary: row[CsvRowHeaders.uuid] ?? 'Scarlet Document',
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
//         method: _issueExist ? 'PUT' : 'POST',
//         key: ticket.key,
//         fields: ticket.fields,
//       });
//       console.log('Ticket en la cola:', JSON.stringify(ticket));
//     }
//   } catch (error) {
//     console.error('Error al procesar el archivo CSV desde S3:', error);
//     throw new Error('Error al procesar el archivo CSV');
//   }
// }

// const _getIssueKey = async (payload: RequestPayload) => await storage.get(`scarlett-${payload.id}`);

// async function _getIssueStatus(payload: GetIssueStatusPayload) {
//   const formattedQuery = `key in (${payload.issueKeys.map((id) => `"${id}"`).join(', ')})`;
//   const issues = (await getExistingIssues(formattedQuery, [CF.status])) ?? [];
//   return (
//     issues.map((issue) => ({
//       key: issue.key,
//       fields: {
//         status: issue.fields.status,
//       },
//     })) ?? []
//   );
// }

