import { JiraClient } from '/opt/utils/index.js';
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
        const payload = await request.json();
        console.log('Request body:', payload);
        if (!payload.token || payload.token === '') {
            return new Response('Authorization header is required', { status: 400 });
        }
        const client = new JiraClient(payload.token, payload.apiBaseUrl);
        const responseBody = payload;
        if (!responseBody.Items || !Array.isArray(responseBody.Items)) {
            return new Response('Invalid request body: Items array is required', { status: 400 });
        }
        const parsedData = responseBody.Items;
        // Remover las filas que tienen '0' en la columna 'uuid'
        const filteredData = parsedData.filter((row) => row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */] !== '0');
        if (!filteredData.length) {
            return new Response('All rows have uuid 0', { status: 200 });
        }
        const scarlettIds = filteredData.map((row) => row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */]);
        console.log(`Cantidad de scarlett Ids: ${scarlettIds.length}`, scarlettIds);
        const existingIssues = await client.getExistingIssues(`"Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`, ["customfield_19899" /* CF.scarlett_id */, "summary" /* CF.summary */]);
        console.log('Existing issues:', existingIssues);
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
