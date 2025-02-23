export default async function post(event) {
    console.log('Event:', event);
    console.log('Event Payload:', await event.json());
    // const {
    //   operation,
    //   forgeToken,
    //   apiBaseUrl,
    // }: {operation: OperationPayload; forgeToken: string; apiBaseUrl: string} = await event.json();
    // if (!operation || !forgeToken || !apiBaseUrl) {
    //   return new Response(JSON.stringify('invalid event'), {status: 400});
    // }
    // if (!operation.method) {
    //   console.log('Ticket Omitido');
    //   return new Response('', {status: 204});
    // }
    // const jiraClient = new JiraClient(forgeToken, apiBaseUrl);
    // const method = operation.method;
    // switch (operation.change.type) {
    //   case 'create':
    //   case 'update':
    //     jiraClient.sendRequest(operation);
    //     break;
    //   case 'transition':
    //     jiraClient.transitionIssue(operation);
    //     break;
    //   default:
    //     console.log('Ticket Omitido');
    //     return new Response('', {status: 204});
    // }
    return new Response(JSON.stringify('not implemented'));
}
