import api, {route} from '@forge/api';
import {Invoice, Issue, QueryPayload} from './types';
import {AtlassianDocument, TextNode} from './types/atlassian-document';
import {CF} from './custom_fields';

const ISSUE_TYPE = 10048;

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

  const payloadData = {
    [CF.scarlettId]: [payload.scarlettId],
    [CF.country]: {value: payload.country},
    [CF.nombreCampo2]: payload.description,
  };

  const jsonBody: Issue = {
    key: issueKey,
    fields: {
      project: {id: payload.projectId},
      summary: payload.summary,
      [CF.scarlettId]: [payload.scarlettId],
      [CF.country]: {value: payload.country},
      issuetype: {id: ISSUE_TYPE},
      description: _description(payload.description),
    },
  };
  const response = await api.asApp().requestJira(jiraRoute, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jsonBody),
  });

  if (!response.ok) {
    throw new Error(
      `Error al ${method === 'POST' ? 'crear' : 'editar'} issue: ` +
        `${response.status} - ${await response.text()}`,
    );
  }
  if (response.status !== 204) {
    const data = await response.json();
    console.log(`Respuesta al ${method}:`, data);
    return data;
  }
  console.log(`Operación ${method} exitosa sin contenido (204)`);
  return;
};

export async function getExistingIssues(query: string): Promise<Issue[]> {
  const fields = 'summary,description,customfield_10378';
  const response = await api
    .asApp()
    .requestJira(route`/rest/api/3/search/jql?jql=${query}&fields=${fields}`, {
      method: 'GET',
    });
  const data = (await response.json()) as QueryPayload;
  return data.issues;
}

const _description = (description: string | TextNode | undefined): AtlassianDocument => {
  const _isAdf = (body: any): body is TextNode =>
    body && typeof body === 'object' && 'type' in body && body.type === 'text';

  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [
          _isAdf(description)
            ? description
            : {
                type: 'text',
                text: typeof description === 'string' ? description : '',
              },
        ],
      },
    ],
  };
};
