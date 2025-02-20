import { CF, CsvRowHeaders } from 'utils/custom_fields';
import { getExistingIssues } from 'utils/functions';
export default async function post(request) {
    try {
        // Log request details
        console.log('=== REQUEST DETAILS ===');
        console.log('Headers:', Object.fromEntries(request.headers.entries()));
        console.log('Method:', request.method);
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }
        // Parse request body
        const body = await request.json();
        console.log('Request body:', body);
        const responseBody = body;
        if (!responseBody.Items || !Array.isArray(responseBody.Items)) {
            return new Response('Invalid request body: Items array is required', { status: 400 });
        }
        const parsedData = responseBody.Items;
        const scarlettIds = parsedData.map((row) => row[CsvRowHeaders.uuid]);
        console.log(`Cantidad de scarlett Ids: ${scarlettIds.length}`, scarlettIds);
        const existingIssues = await getExistingIssues(`"Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`, [CF.scarlett_id, CF.summary]);
        console.log('Existing issues:', existingIssues);
        // Remover las filas que tienen '0' en la columna 'uuid'
        const filteredData = parsedData.filter((row) => row[CsvRowHeaders.uuid] !== '0');
        return new Response(JSON.stringify({
            systemToken: 'abc123',
            sessionValid: true,
            existingIssues,
            filteredData,
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
