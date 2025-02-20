import {v4 as uuidv4} from 'uuid';
import { S3Client } from 'bun';


export default async function post(request: Request): Promise<Response> {
  // Handle CORS preflight request
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

  try {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.log('Content-Type:', contentType);
      return new Response('Content-Type must be application/json', {status: 400});
    }

    try {
      const rawBody = await request.json();
      // Si el body es un string, intentamos parsearlo
      const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      console.log('Parsed payload:', payload);
    } catch (error) {
      console.error('Error parsing payload:', error);
      return new Response('Invalid JSON payload: ' + error, {status: 400});
    }

    const client = new S3Client({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: 'scarlet-operations-dev-scarlet-storage',
    });

    const fileId = uuidv4();
    const key = `uploads/${fileId}.csv`;
    console.log('Creating presigned URL for key:', key);
    
    const s3File = client.file(key);
    const url = s3File.presign({
      expiresIn: 3600,
      method: 'PUT',
    });
    
    console.log('Generated presigned URL:', url);
    
    if (!url) {
      console.error('Failed to generate presigned URL');
      return new Response('Failed to generate upload URL', { status: 500 });
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        url,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Transfer-Encoding': 'binary',
        },
      },
    );
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return new Response('Failed to generate upload URL', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    });
  }
}
