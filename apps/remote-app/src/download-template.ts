import {S3Client} from 'bun';

export default async function get(request: Request): Promise<Response> {
  try {
    // Log request details
    console.log('=== REQUEST DETAILS ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Method:', request.method);

    if (request.method !== 'GET') {
      return new Response('Method not allowed', {status: 405});
    }

    const client = new S3Client({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: 'scarlet-operations-dev-scarlet-storage',
    });

    const file = client.file('scarlet-template.xlsx');
    const downloadUrl = file.presign({
      expiresIn: 3600,
    });

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error generating download URL:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to generate download URL',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
