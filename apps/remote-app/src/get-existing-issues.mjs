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
        const { event: { Items: rowsRaw, BatchInput: { executionId, projectId, apiBaseUrl, forgeToken }, }, } = payload;
        let rows = rowsRaw.map((row) => {
            const [pais, uuid, documentType, estadoDeValidaciones, proveedor, proveedorId, fechaDeRecepcion, asignacionSapSku, estadoIntegracionSapFinal, estadoDeConciliacion, estadoDeLasSolicitudes, ordenDeCompra, fechaDeEmision, numeroDeEnvio, estadoDeEnvio, monto, estadoSap, estadoEnJira, subEstadoEnJira,] = Object.values(row)[0].split(';');
            return {
                pais,
                uuid,
                documentType,
                estadoDeValidaciones,
                proveedor,
                proveedorId,
                fechaDeRecepcion,
                asignacionSapSku,
                estadoDeConciliacion,
                estadoDeLasSolicitudes,
                ordenDeCompra,
                fechaDeEmision,
                numeroDeEnvio,
                estadoDeEnvio,
                monto,
                estadoIntegracionSapFinal: estadoSap,
                estadoEnJira,
                subEstadoEnJira,
            };
        });
        console.log('Rows:', rows);
        if (!forgeToken || forgeToken === '') {
            console.error('Authorization header is required');
            return new Response('Authorization header is required', { status: 400 });
        }
        if (!rows || !Array.isArray(rows)) {
            console.error('Invalid request body: Items array is required', `Items: ${rows}, Items type: ${typeof rows}`);
            return new Response('Invalid request body: Items array is required', { status: 400 });
        }
        // const parsedData: CsvRow[] = rows;
        // Remover las filas que tienen '0' en la columna 'uuid'
        rows = rows.filter((row) => row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */] !== '0');
        if (!rows.length) {
            console.error('All rows have uuid 0');
            return new Response('All rows have uuid 0', { status: 200 });
        }
        const scarlettIds = rows.map((row) => row.uuid);
        console.log(`Cantidad de scarlett Ids: ${scarlettIds.length}`, scarlettIds);
        const client = new JiraClient(forgeToken, apiBaseUrl);
        const existingIssues = await client.getExistingIssues(`"Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`, ["customfield_19899" /* CF.scarlett_id */, "summary" /* CF.summary */]);
        console.log('Existing issues:', existingIssues);
        return new Response(JSON.stringify({
            systemToken: 'abc123',
            sessionValid: true,
            existingIssues,
            rows,
            method: 'OMIT',
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
