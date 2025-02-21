// import {SQSClient, SendMessageCommand} from '@aws-sdk/client-sqs';
import { validateContextToken } from '/opt/utils/index.js';
import * as fs from 'fs';
import * as path from 'path';
// const sqsClient = new SQSClient({
//   region: process.env.AWS_REGION,
// });
function getDirStructure(dir) {
    const items = fs.readdirSync(dir);
    const result = {};
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            result[item] = getDirStructure(fullPath);
        }
        else {
            result[item] = {
                size: stats.size,
                modified: stats.mtime,
                type: 'file',
            };
        }
    }
    return result;
}
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
        // Validar headers requeridos
        if (!traceId || !spanId || !authToken) {
            return new Response('Missing required headers: x-b3-traceid, x-b3-spanid, or authorization', {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain',
                },
            });
        }
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
        // Preparar mensaje para SQS
        const message = {
            apiBaseUrl,
            forgeToken: forgeOauthSystem,
            traceId,
            spanId,
            cloudId: context.cloudId,
            siteUrl: context.siteUrl,
            timestamp: new Date().toISOString(),
        };
        // Enviar mensaje a SQS
        // const command = new SendMessageCommand({
        //   QueueUrl: process.env.SQS_QUEUE_URL,
        //   MessageBody: JSON.stringify(message),
        //   MessageAttributes: {
        //     TraceId: {
        //       DataType: 'String',
        //       StringValue: traceId,
        //     },
        //     SpanId: {
        //       DataType: 'String',
        //       StringValue: spanId,
        //     },
        //   },
        // });
        // await sqsClient.send(command);
        return new Response(JSON.stringify({
            success: true,
            message: 'Session validated and task queued',
            traceId,
            spanId,
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
