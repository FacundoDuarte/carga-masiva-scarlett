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
  const {method, key: issueKey, status} = payload;
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
    await transitionIssue(payload);
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

export const validateContextToken = async (
  invocationToken: string,
  appId: string,
): Promise<ValidationResponse | undefined> => {
  console.log('Parametros: ', invocationToken, appId);
  const jwksUrl = 'https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json';
  const JWKS = createRemoteJWKSet(new URL(jwksUrl));

  try {
    console.log(`iniciando verificacion: ${invocationToken} - ${appId}`);
    console.log(`JWKS: ${JSON.stringify(JWKS)}`);
    const {payload} = await jwtVerify(invocationToken, JWKS, {
      audience: `ari:cloud:ecosystem::app/${appId}`,
    });
    console.log(`Payload: ${JSON.stringify(payload)}`);
    // Mapear el payload a ValidationResponse
    const response: ValidationResponse = {
      app: payload.app as ValidationResponse['app'],
      context: payload.context as ValidationResponse['context'],
      principal: payload.principal as ValidationResponse['principal'],
      aud: payload.aud as string, // El aud ya viene en el formato correcto
      exp: payload.exp as number,
      iat: payload.iat as number,
      iss: payload.iss as string,
      nbf: payload.nbf as number,
      jti: payload.jti as string,
    };

    return response;
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

('use strict');
import fetch from 'node-fetch';
import {ValidationResponse} from './interfaces';

interface FetchFromJiraParams {
  token: string;
  apiBaseUrl: string;
  path: string;
  method: string;
  body?: string | object;
}

export async function fetchFromJira({token, apiBaseUrl, path, method, body}: FetchFromJiraParams) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (typeof body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  return await fetch(`${apiBaseUrl}/rest/api${path}`, {
    headers,
    method,
    body: method == 'POST' ? JSON.stringify(body) : undefined,
  });
}

export async function transitionIssue(payload: Partial<Invoice>) {
  const {status, key: issueKey} = payload;
  
  if (!status || !issueKey) {
    throw new Error('Status and issueKey are required for transition');
  }

  // Si el estado que recibimos en el CSV es diferente al estado actual del ticket, entonces lo transicionamos al estado que
  // recibimos del CSV
  const issue = await getExistingIssues(`key = ${issueKey}`, ['status']);
  if (!issue.length) {
    throw new Error(`Issue with key ${issueKey} not found`);
  }

  if (!issue[0].fields?.status?.name) {
    throw new Error(`Status field not found for issue ${issueKey}`);
  }

  const actualStatus = issue[0].fields.status.name;

  if (status.name !== actualStatus) {
    const bodyData = {
      transition: {
        id: status.transitionId,
      },
    };

    const response = await fetchFromJira({
      token: 'token',
      apiBaseUrl: 'appBaseUrl',
      path: `/rest/api/3/issue/${issueKey}/transitions`,
      method: 'POST',
      body: JSON.stringify(bodyData),
    });
  }
}
