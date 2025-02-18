import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { validateContextToken } from 'utils/functions';
const sqsClient = new SQSClient({
    region: process.env.AWS_REGION,
});
export default async function post(request) {
    try {
        // Validar método HTTP
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }
        // Obtener headers requeridos
        const traceId = request.headers.get('x-b3-traceid');
        const spanId = request.headers.get('x-b3-spanid');
        const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
        const forgeOauthSystem = request.headers.get('x-forge-oauth-system');
        // Validar headers requeridos
        if (!traceId || !spanId || !authToken) {
            return new Response('Missing required headers: x-b3-traceid, x-b3-spanid, or authorization', { status: 400 });
        }
        console.log('=== REQUEST DETAILS ===');
        console.log('Headers:', Object.fromEntries(request.headers.entries()));
        // Validar el token de contexto
        const validation = await validateContextToken(authToken, process.env.APP_ID || '');
        if (!validation) {
            return new Response('Invalid context token', { status: 401 });
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
        const command = new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify(message),
            MessageAttributes: {
                TraceId: {
                    DataType: 'String',
                    StringValue: traceId,
                },
                SpanId: {
                    DataType: 'String',
                    StringValue: spanId,
                },
            },
        });
        await sqsClient.send(command);
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
