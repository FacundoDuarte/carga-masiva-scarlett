import { v4 as uuidv4 } from 'uuid';
import { S3Client } from 'bun';
export default async function post(request) {
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
            return new Response('Content-Type must be application/json', { status: 400 });
        }
        const payload = await request.json();
        if (!payload.fileContent || !payload.fileName) {
            return new Response('Missing required fields', { status: 400 });
        }
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(payload.fileContent, 'base64');
        const bodyBuffer = new Uint8Array(fileBuffer);
        console.log('File received:', {
            fileName: payload.fileName,
            size: bodyBuffer.length,
            type: payload.fileType || 'text/csv'
        });
        console.log('Body buffer length:', bodyBuffer.length);
        if (bodyBuffer.length === 0) {
            console.log('No content detected');
            return new Response('No CSV content provided', { status: 400 });
        }
        // Log the first few bytes for debugging
        console.log('First bytes (hex):', Array.from(bodyBuffer.slice(0, 16))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' '));
        const client = new S3Client({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
            bucket: 'scarlet-operations-dev-scarlet-storage',
        });
        const fileId = uuidv4();
        const key = `uploads/${fileId}.csv`;
        const s3File = client.file(key);
        // Count CSV rows (excluding header)
        const csvContent = new TextDecoder().decode(bodyBuffer);
        const rows = csvContent.trim().split('\n');
        const rowCount = Math.max(0, rows.length - 1); // Subtract 1 for header
        const writer = s3File.writer();
        writer.write(bodyBuffer);
        await writer.end();
        return new Response(JSON.stringify({
            success: true,
            fileId,
            key,
            rowCount,
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Transfer-Encoding': 'binary',
            },
        });
    }
    catch (error) {
        console.error('Error generating signed URL:', error);
        return new Response('Failed to generate upload URL', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
        });
    }
}
