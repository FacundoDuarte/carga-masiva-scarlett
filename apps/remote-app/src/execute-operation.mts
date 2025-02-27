import {JiraClient} from '/opt/utils/index.js';

export default async function post(event: Request): Promise<Response> {
  console.log('Event:', event);
  try {
    const payload = await event.json();
    console.log('Event Payload:', payload);

    // Array para almacenar todas las respuestas
    const responses = [];

    // Iterar sobre cada registro en Records
    for (const record of payload.event.Records) {
      try {
        // Parsear el body de cada registro que viene como string
        const parsedBody = JSON.parse(record.body);
        const {operation, forgeToken, apiBaseUrl} = parsedBody;

        console.log(`Processing operation for: ${operation?.issue?.fields?.summary}`);

        if (!operation || !forgeToken || !apiBaseUrl) {
          console.log('Invalid record - missing required fields');
          responses.push({success: false, status: 400, error: 'Invalid record'});
          continue;
        }

        const jiraClient = new JiraClient(forgeToken, apiBaseUrl);
        const response = await jiraClient.sendRequest(operation);
        console.log(`SUCCESS: ${response.success}, STATUS: ${response.status}`);
        responses.push(response);
      } catch (recordError) {
        console.error('Error processing record:', recordError);
        responses.push({success: false, status: 400, error: 'Error processing record'});
      }
    }

    // Si todos los registros fallaron, retornar 400
    const allFailed = responses.every(r => !r.success);
    const status = allFailed ? 400 : 200;

    return new Response(JSON.stringify({responses}), {status});
  } catch (error) {
    console.error('Error parsing event payload:', error);
    return new Response(JSON.stringify({error: 'invalid event'}), {status: 400});
  }
}
