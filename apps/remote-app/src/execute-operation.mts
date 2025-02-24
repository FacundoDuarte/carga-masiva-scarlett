import {JiraClient} from '/opt/utils/index.js';

export default async function post(event: Request): Promise<Response> {
  console.log('Event:', event);
  // console.log('Event Payload:', await event.text());
  const payload = await event.text();
  const {
    event: {operation, forgeToken, apiBaseUrl},
  } = JSON.parse(payload);

  if (!operation || !forgeToken || !apiBaseUrl) {
    return new Response(JSON.stringify('invalid event'), {status: 400});
  }
  const jiraClient = new JiraClient(forgeToken, apiBaseUrl);

  const {success, status} = await jiraClient.sendRequest(operation);
  console.log(`SUCCESS: ${success}, STATUS: ${status}`);
  return new Response(JSON.stringify({success, status}), {status});
}
