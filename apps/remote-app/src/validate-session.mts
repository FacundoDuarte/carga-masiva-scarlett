import {JiraClient, StateMachine, ValidationResponse} from '/opt/utils/index.js';


const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME ?? 'scarlet-operations-dev-storage';

const STATE_MACHINE_ARN =
  process.env.STATE_MACHINE_ARN ??
  'arn:aws:states:us-east-1:529202746267:stateMachine:scarlet-execution-machine';

export default async function post(request: Request): Promise<Response> {
  try {
    if (request.method == 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    // Validar método HTTP
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
    console.log('=== REQUEST DETAILS ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Method:', request.method);

    // Obtener headers requeridos
    const traceId = request.headers.get('x-b3-traceid');
    const spanId = request.headers.get('x-b3-spanid');
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const forgeOauthSystem = request.headers.get('x-forge-oauth-system');
    const {fileId, projectId} = await request.json();
    console.log(`FileId: ${fileId}, ProjectId: ${projectId}`);
    if (!fileId || !projectId) {
      console.log(
        `Missing required parameters: fileId and projectId {fileId: ${fileId}, projectId: ${projectId}}`,
      );
      return new Response('Missing required parameters: fileId and projectId', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
    // Validar headers requeridos
    if (!traceId || !spanId || !authToken) {
      console.log(
        `Missing required headers: x-b3-traceid, x-b3-spanid, or authorization {x-b3-traceid: ${traceId}, x-b3-spanid: ${spanId}, authorization: ${authToken}}`,
      );
      return new Response('Missing required headers: x-b3-traceid, x-b3-spanid, or authorization', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    console.log('File ID:', fileId);
    console.log('Project ID:', projectId);

    console.log('=== Validate Session Handler ===');
    console.log('APP_ID:', process.env);
    console.log('Auth Token (first 10 chars):', authToken?.substring(0, 10) + '...');
    // Validar el token de contexto
    console.log('Calling validateContextToken...');
    const validation = (await JiraClient.validateContextToken(
      authToken,
      process.env.APP_ID || 'e288d60c-ca8d-4d94-8a0a-6730f3786ab3',
    )) as ValidationResponse;
    console.log('validateContextToken response:', validation ? 'Token valid' : 'Token invalid');

    if (!validation) {
      console.log('Token validation failed, returning 401');
      return new Response('Invalid context token', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Extraer información relevante
    const {app, context} = validation;
    const {apiBaseUrl} = app;
    console.log('API Base URL:', apiBaseUrl);
    console.log('Forge Token:', forgeOauthSystem);
    console.log('Trace ID:', traceId);
    console.log('Span ID:', spanId);
    console.log('Cloud ID:', context.cloudId);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Execution ID:', fileId);
    console.log('Project ID:', projectId);

    const machine = await new StateMachine().start({
      name: fileId,
      traceHeader: `${traceId}-${spanId}`,
      input: JSON.stringify({
        forgeOauthSystem,
        context,
        apiBaseUrl,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: 201,
        message: 'Session validated and task queued',
        executionId: fileId,
        executionArn: machine.executionArn,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        status: 500,
        message: 'Error processing request',
        error: error,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
}
