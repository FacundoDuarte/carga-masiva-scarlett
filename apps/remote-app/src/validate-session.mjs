import { JiraClient, validateContextToken } from '/opt/utils/index.js';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
const sfnClient = new SFNClient({});
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME ?? 'scarlet-operations-dev-scarlet-storage';
// function getDirStructure(dir: string): any {
//   const items = fs.readdirSync(dir);
//   const result: Record<string, any> = {};
//   for (const item of items) {
//     const fullPath = path.join(dir, item);
//     const stats = fs.statSync(fullPath);
//     if (stats.isDirectory()) {
//       result[item] = getDirStructure(fullPath);
//     } else {
//       result[item] = {
//         size: stats.size,
//         modified: stats.mtime,
//         type: 'file',
//       };
//     }
//   }
//   return result;
// }
// export default async function post(request: Request): Promise<Response> {
//   // Obtener la estructura del directorio /opt
//   const optStructure = getDirStructure('/opt');
//   console.log(optStructure);
//   return new Response(JSON.stringify(optStructure), {
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   });
// }
export default async function post(request) {
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
        const res = await request.json();
        console.log(`Request body: ${JSON.stringify(res)}`);
        const { fileId, projectId } = JSON.parse(res);
        // const {fileId, projectId} = await request.json();
        if (!fileId || !projectId) {
            console.log(`Missing required parameters: fileId and projectId {fileId: ${fileId}, projectId: ${projectId}}`);
            return new Response('Missing required parameters: fileId and projectId', {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain',
                },
            });
        }
        // Validar headers requeridos
        if (!traceId || !spanId || !authToken) {
            console.log(`Missing required headers: x-b3-traceid, x-b3-spanid, or authorization {x-b3-traceid: ${traceId}, x-b3-spanid: ${spanId}, authorization: ${authToken}}`);
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
        const validation = (await validateContextToken(authToken, process.env.APP_ID || 'e288d60c-ca8d-4d94-8a0a-6730f3786ab3'));
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
        const { app, context } = validation;
        const { apiBaseUrl } = app;
        console.log('API Base URL:', apiBaseUrl);
        console.log('Forge Token:', forgeOauthSystem);
        console.log('Trace ID:', traceId);
        console.log('Span ID:', spanId);
        console.log('Cloud ID:', context.cloudId);
        console.log('Site URL:', context.siteUrl);
        console.log('Timestamp:', new Date().toISOString());
        console.log('Execution ID:', fileId);
        console.log('Project ID:', projectId);
        // Preparar mensaje para SQS
        const client = JiraClient.fromString(JSON.stringify({
            token: authToken,
            apiBaseUrl,
        }));
        const message = new StartExecutionCommand({
            stateMachineArn: 'arn:aws:states:us-east-1:529202746267:stateMachine:scarlet-execution-machine',
            name: `scarlet-${fileId}-${new Date().getTime()}`,
            traceHeader: `${traceId}-${spanId}`,
            input: JSON.stringify({
                filePath: `uploads/${fileId}.csv`,
                forgeToken: forgeOauthSystem,
                bucketName: AWS_BUCKET_NAME,
                cloudId: context.cloudId,
                siteUrl: context.siteUrl,
                executionId: fileId,
                apiBaseUrl,
                projectId,
                client,
            }),
        });
        console.log('Step Function Message:', message);
        const machine = await sfnClient.send(message);
        console.log('Step Function Response:', machine);
        return new Response(JSON.stringify({
            success: true,
            message: 'Session validated and task queued',
            executionId: fileId,
        }), {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    catch (error) {
        console.error('Error processing request:', error);
        return new Response(`Error processing request: ${error}`, { status: 500 });
    }
}
