import {CF, JiraClient, OperationPayload} from '/opt/utils/index';

export default async function post(event: Request): Promise<Response> {
  console.log('Execute event:', event);
  const payload = await event.json();
  console.log('Event Payload:', payload);
  const {operation, client} = payload.event;
  console.log(`Processing operation for: ${operation?.issue?.fields?.summary}`);
  if (!operation || !client) {
    console.log('Invalid record - missing required fields');
    return new Response(JSON.stringify({success: false, status: 400, error: 'Invalid record'}), {
      status: 400,
    });
  }
  const {token: authToken, apiBaseUrl} = client;
  if (!authToken || !apiBaseUrl) {
    console.log('Invalid record - missing required fields');
    throw {
      type: 'Lambda.BadRequestException',
      status: 400,
      message: 'Invalid record - missing required fields',
    };
  }
  try {
    const jiraClient = new JiraClient(authToken, apiBaseUrl);
    const {issue, method, change} = operation as OperationPayload;
    if (!issue || !method || !change) {
      console.log('Invalid record - missing required fields');
      throw {
        type: 'Lambda.BadRequestException',
        status: 400,
        message: 'Invalid record - missing required fields',
      };
    }
    let response: {success: boolean; status: number} = {success: false, status: 400};
    switch (change.type) {
      case 'create':
      case 'update':
        response = await jiraClient.sendRequest(operation);
        console.log(`UPDATE SUCCESS: ${response.success}, STATUS: ${response.status}`);
        break;
      case 'transition':
        const {key: issueKey} = issue;
        let key = issueKey;
        if (!key) {
          if (!issue?.fields?.project?.id || !issue?.fields?.[CF.scarlett_id]) {
            console.log('Invalid record - missing required fields');
            throw {
              type: 'Lambda.BadRequestException',
              status: 400,
              message: 'Invalid record - missing required fields',
            };
          }
          const existingIssue = await jiraClient.getExistingIssues(
            `project = ${issue?.fields?.project?.id} AND "Scarlett ID[Labels]" in (${
              issue?.fields?.[CF.uuid]
            })`,
            [CF.uuid, CF.summary, CF.status, 'id'],
          );
          if (existingIssue.length === 0) {
            console.log('Issue not found');
            throw new Error('Issue not found');
          }
          key = existingIssue[0].key as string;
        }
        response = await jiraClient.transitionIssue(key, change.transitionId);
        console.log(`TRANSITION SUCCESS: ${response.success}, STATUS: ${response.status}`);
        break;
      default:
        throw {
          type: 'Lambda.BadRequestException',
          status: 400,
          message: 'Invalid record - invalid change type',
        };
    }
    console.log(`SUCCESS: ${response.success}, STATUS: ${response.status}`);
    return new Response(JSON.stringify({success: response.success, status: response.status}), {
      status: response.status,
    });
  } catch (error: any) {
    console.error('Error executing operation:', error);
    // Si ya es una respuesta HTTP con status 429, simplemente la pasamos
    if (error.status === 400) {
      return new Response(JSON.stringify({success: false, status: 400, error: error.message}), {
        status: 400,
      });
    }
    console.error(`re-throw error: ${JSON.stringify(error)}`);
    throw error;
  }
}
