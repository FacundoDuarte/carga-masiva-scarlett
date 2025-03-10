import {JiraClient, validateContextToken, ValidationResponse} from '/opt/utils/index.js';
import {SFNClient, DescribeExecutionCommand} from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({});

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME ?? 'scarlet-operations-dev-storage';

const STATE_MACHINE_ARN =
  process.env.STATE_MACHINE_ARN ??
  'arn:aws:states:us-east-1:529202746267:stateMachine:scarlet-execution-machine';

export default async function post(request: Request): Promise<Response> {
  
  try {
    // Manejo de CORS para preflight
    if (request.method === 'OPTIONS') {
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

    // Se espera que se invoque con el método POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Se recibe el executionArn en el cuerpo de la petición
    const { executionArn } = await request.json();
    if (!executionArn) {
      return new Response('Missing required parameter: executionArn', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Ejecutar DescribeExecution para obtener los detalles de la ejecución
    const command = new DescribeExecutionCommand({ executionArn });
    const result = await sfnClient.send(command);

    // Verificar que la ejecución haya finalizado (SUCCEEDED, FAILED o TIMED_OUT)
    if (!result.status || !['SUCCEEDED', 'FAILED', 'TIMED_OUT'].includes(result.status)) {
      return new Response('La ejecución aún no ha finalizado', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // El campo "output" es una cadena JSON, parsearla para extraer la información
    let output;
    try {
      if (!result.output) {
        return new Response('No se encontró output en la ejecución', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      output = JSON.parse(result.output);
    } catch (error) {
      return new Response('Error al parsear la salida de la ejecución', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Suponiendo que el output tiene un campo "mapRunArn"
    const mapRunArn = output.mapRunArn;
    if (!mapRunArn) {
      return new Response('No se encontró mapRunArn en la salida de la ejecución', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response(JSON.stringify({ mapRunArn }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en DescribeExecution:', error);
    return new Response(`Error processing request: ${error}`, { status: 500 });
  }
}
