import { statusMapping, ValidStatusNames, JiraClient, scarlettMapping, } from '/opt/utils/index.js';
const ISSUE_TYPE_ID = 11871;
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
                ["Pais" /* CsvRowHeaders.pais */]: pais,
                ["N\u00FAmero de documento" /* CsvRowHeaders.uuid */]: uuid,
                ["Tipo de documento" /* CsvRowHeaders.documentType */]: documentType,
                ["Estado de validaciones" /* CsvRowHeaders.estadoDeValidaciones */]: estadoDeValidaciones,
                ["Proveedor" /* CsvRowHeaders.proveedor */]: proveedor,
                ["Proveedor ID" /* CsvRowHeaders.proveedorId */]: proveedorId,
                ["Fecha de recepci\u00F3n" /* CsvRowHeaders.fechaDeRecepcion */]: fechaDeRecepcion,
                ["Asignaci\u00F3n de SAP SKU" /* CsvRowHeaders.asignacionSapSku */]: asignacionSapSku,
                ["Estado de conciliaci\u00F3n" /* CsvRowHeaders.estadoDeConciliacion */]: estadoDeConciliacion,
                ["Estado de las solicitudes" /* CsvRowHeaders.estadoDeLasSolicitudes */]: estadoDeLasSolicitudes,
                ["Orden de compra" /* CsvRowHeaders.ordenDeCompra */]: ordenDeCompra,
                ["Fecha de emisi\u00F3n" /* CsvRowHeaders.fechaDeEmision */]: fechaDeEmision,
                ["N\u00FAmero de env\u00EDo" /* CsvRowHeaders.numeroDeEnvio */]: numeroDeEnvio,
                ["Estado de env\u00EDo" /* CsvRowHeaders.estadoDeEnvio */]: estadoDeEnvio,
                ["Monto" /* CsvRowHeaders.monto */]: monto,
                ["Estado SAP" /* CsvRowHeaders.estadoIntegracionSapFinal */]: estadoSap,
                ["Estado en Jira" /* CsvRowHeaders.estadoEnJira */]: estadoEnJira,
                ["Sub - Estado en Jira" /* CsvRowHeaders.subEstadoEnJira */]: subEstadoEnJira,
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
        rows = rows.filter((row) => row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */] !== '0');
        if (!rows.length) {
            console.error('All rows have uuid 0');
            return new Response('All rows have uuid 0', { status: 200 });
        }
        const scarlettIds = rows.map((row) => row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */]);
        console.log(`Cantidad de scarlett Ids: ${scarlettIds.length}`, scarlettIds);
        const client = new JiraClient(forgeToken, apiBaseUrl);
        const existingIssues = await client.getExistingIssues(`"Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`, ["customfield_19899" /* CF.scarlett_id */, "summary" /* CF.summary */, "status" /* CF.status */]);
        console.log('Existing issues:', existingIssues);
        const operations = [];
        for (const row of rows) {
            const existingIssue = existingIssues.find((issue) => issue.fields["customfield_19899" /* CF.scarlett_id */] === row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */]);
            const { key, fields: { ["summary" /* CF.summary */]: summary, ["status" /* CF.status */]: status }, } = existingIssue ?? {
                key: undefined,
                fields: { summary: row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */], status: { name: "Aprova\u00E7\u00E3o Compliance" /* StatusName.AprovacaoCompliance */ } },
            };
            // Create base issue structure
            const issue = {
                key,
                fields: {
                    project: { id: projectId },
                    summary,
                    issuetype: { id: ISSUE_TYPE_ID },
                },
            };
            for (const [cfField, mapFunction] of Object.entries(scarlettMapping)) {
                issue.fields[cfField] = mapFunction(row);
            }
            operations.push({
                issue,
                method: key ? 'PUT' : 'POST',
                change: {
                    type: key ? 'update' : 'create',
                },
            });
            // Check if a transition is needed
            let transitionId = checkTransitionAvailable(status, row["Estado en Jira" /* CsvRowHeaders.estadoEnJira */]);
            if (transitionId) {
                operations.push({
                    issue,
                    method: 'POST',
                    change: {
                        type: 'transition',
                        transitionId,
                    },
                });
            }
        }
        return new Response(JSON.stringify([...operations.map((operation) => ({ operation, forgeToken, apiBaseUrl }))]), {
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
function checkTransitionAvailable(currentStatus, statusFromCsv) {
    if (!currentStatus || currentStatus.name == statusFromCsv)
        return;
    if (!isValidStatus(currentStatus.name) || !isValidStatus(statusFromCsv)) {
        throw new Error(`Status ${currentStatus.name} or ${statusFromCsv} is not valid`);
    }
    return statusMapping[statusFromCsv] ?? undefined;
}
//Necesito crearme en typescript una función auxiliar que reciba un string y me permita validar que es parte del enumerado StatusName
function isValidStatus(status) {
    return Object.values(ValidStatusNames).includes(status);
}
