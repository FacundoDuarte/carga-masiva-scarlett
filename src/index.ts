import Resolver from '@forge/resolver';
import {Queue} from '@forge/events';
import {Invoice, Issue, Job, JobStatus} from '../utils/types';
import {getExistingIssues} from '../utils/functions';
import {CF, row} from '../utils/custom_fields';
import {storage} from '@forge/api';
import api, {route} from '@forge/api';
import {S3Client, GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import fetch from 'node-fetch';
import Papa from 'papaparse';

const resolver = new Resolver();
const queue = new Queue({key: 'operations-queue'});



resolver.define('issue-operations-from-csv', async (req) => {
  const jobProgress = queue.getJob(req.context.jobId);
  try {
    const {s3Key, projectId} = req.payload;
    return await handleIssueOperationsFromCsv(s3Key, projectId);
  } catch (error) {
    await jobProgress.cancel();
    throw error;
  }
});

interface JobStatusRequest {
  payload: {
    jobsList: string[];
  };
  context: any;
}

resolver.define('get-jobs-status', async ({payload, context}: JobStatusRequest) => {
  const {jobsList} = payload;
  const updatedJobs: Job[] = [];

  for (const jobId of jobsList) {
    const jobStatus = await _getJobStatus(jobId);
    updatedJobs.push({
      id: jobId,
      status: jobStatus,
    });
  }
  return updatedJobs;
});

resolver.define('get-issue-key', async ({payload, context}) => {
  return await storage.get(`scarlett-${payload.id}`);
});

resolver.define('get-issue-status', async ({payload, context}) => {
  const formattedQuery = `key in (${payload.issueKeys.map((id) => `"${id}"`).join(', ')})`;

  // Obtenemos las incidencias desde Jira, pidiendo 'status' en fields
  const issues = await getExistingIssues(formattedQuery, 'status');

  // ANTES devolvías solo appearance y name
  return issues.map((issue) => ({
    key: issue.key,
    fields: {
      status: issue.fields.status,
    },
  }));
});

resolver.define('download-template', async ({payload, context}: JobStatusRequest) => {
  const client = new S3Client({
    region: 'us-east-1', // asegúrate de que esta sea tu región
    credentials: {
      accessKeyId: 'AKIAXWNXRCON5E6GFRRX',
      secretAccessKey: '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',
    },
  });

  const command = new GetObjectCommand({
    Bucket: 'issue-reminder-app-dev-issrem-529202746267',
    Key: 'Carga Masiva_Master File Enero.xlsx',
  });

  // Generar URL firmada
  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
  });

  return signedUrl;
});

resolver.define('get-upload-url', async ({payload, context}) => {
  const client = new S3Client({
    region: 'us-east-1', // asegúrate de que esta sea tu región
    credentials: {
      accessKeyId: 'AKIAXWNXRCON5E6GFRRX',
      secretAccessKey: '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',
    },
  });

  const command = new PutObjectCommand({
    Bucket: 'issue-reminder-app-dev-issrem-529202746267',
    Key: `uploads/${Date.now()}-${payload.fileName}`, // Usa un nombre único para cada archivo
  });

  // Generar URL firmada
  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
  });

  return signedUrl;
});

async function _getJobStatus(jobId: string): Promise<JobStatus> {
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

async function handleIssueOperationsFromCsv(s3Key: string, projectId: string) {
  try {
    // Asegurarnos que s3Key es una URL válida
    const s3Url = `https://issue-reminder-app-dev-issrem-529202746267.s3.amazonaws.com/${s3Key}`;
    const response = await fetch(s3Url);
    const csvText = await response.text();

    // Parsear el archivo CSV
    const parsedData = Papa.parse(csvText, {
      header: true, // Asume que la primera fila es el encabezado
    }).data;

    // Iterar sobre cada fila del CSV
    const results = parsedData.map((row) => {
      // Aquí puedes realizar las operaciones necesarias con cada fila
      // Por ejemplo, crear un ticket o realizar alguna otra acción
      return {
        ticket: {
          /* ... datos del ticket ... */
        },
        jobId: 'someJobId', // Genera o asigna un ID de trabajo
      };
    });

    return results;
  } catch (error) {
    console.error('Error al procesar el archivo CSV desde S3:', error);
    throw new Error('Error al procesar el archivo CSV');
  }
}

export const handler: ReturnType<typeof resolver.getDefinitions> = resolver.getDefinitions();
