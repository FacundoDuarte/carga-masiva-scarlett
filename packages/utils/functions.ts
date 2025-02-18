// import api, {route} from '@forge/api';
import {Invoice, Issue} from './types';
import {SignJWT, jwtVerify, createRemoteJWKSet} from 'jose';

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
  if (!method) return;

  const jiraRoute = _isEdit(method)
    ? `/rest/api/3/issue/${validateIssueKey(method, issueKey)!}`
    : `/rest/api/3/issue`;

  const response = await fetchFromJira({
    token: 'token',
    apiBaseUrl: 'appBaseUrl',
    path: jiraRoute,
    method: method,
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
  const response = await fetchFromJira({
    token: 'token',
    apiBaseUrl: 'appBaseUrl',
    path: `/rest/api/3/search/jql`,
    method: 'POST',
    body: JSON.stringify({
      fields: fields,
      jql: query,
      maxResults: QUERY_MAX_RESULTS,
    }),
  });
  if (!response.ok) throw new Error(`Error Http: ${await response.text()}`);
  const data = await response.json();
  console.log(`GET EXISTING ISSUES RETURN ${JSON.stringify(data)}`);
  return data.issues;
}

export const validateContextToken = async (invocationToken: string, appId: string): Promise<ValidationResponse | undefined> => {
  const jwksUrl = 'https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json';
  const JWKS = createRemoteJWKSet(new URL(jwksUrl) as URL);

  try {
    const payload = await jwtVerify(invocationToken, JWKS, {
      audience: `ari:cloud:ecosystem::app/${appId}`,
    });
    console.log(payload);
    return payload;
  } catch (e) {
    console.error(e);
  }
};

('use strict');
import fetch from 'node-fetch';

interface FetchFromJiraParams {
  token: string;
  apiBaseUrl: string;
  path: string;
  method: string;
  body?: unknown;
}

export async function fetchFromJira({token, apiBaseUrl, path, method, body}: FetchFromJiraParams) {
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  return await fetch(`${apiBaseUrl}/rest/api${path}`, {headers, method, body});
}
