import api, {route} from '@forge/api';
import {Invoice, Issue, QueryPayload} from './types';

const QUERY_MAX_RESULTS: number = 5000;

const validateIssueKey = (method: string, issueKey?: string) => {
  if (method.toLowerCase() === 'PUT' && !issueKey) {
    throw new Error('issueKey es requerido para editar un ticket');
  }
  return issueKey;
};

const _isEdit = (method: string) => method == 'PUT';

export const requestTicketsJira = async (payload: Partial<Invoice>) => {
  const {method, key: issueKey} = payload;
  const jiraRoute = _isEdit(method)
    ? route`/rest/api/3/issue/${validateIssueKey(method, issueKey)!}`
    : route`/rest/api/3/issue`;

  const response = await api.asApp().requestJira(jiraRoute, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Error al ${method === 'POST' ? 'crear' : 'editar'} issue: ` +
        `${response.status} - ${await response.text()}`,
    );
  }
  if (response.status !== 204) {
    const data = await response.json();
    return data;
  }
  return;
};

export async function getExistingIssues(query: string, fields: string[]): Promise<Issue[]> {

  const response = await api.asApp().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    body: JSON.stringify({
      fields: fields,
      jql: query,
      maxResults: QUERY_MAX_RESULTS,
    }),
  });
  if (!response.ok) throw new Error(`Error Http: ${await response.text()}`);
  const data = (await response.json()) as QueryPayload;

  return data.issues;
}
