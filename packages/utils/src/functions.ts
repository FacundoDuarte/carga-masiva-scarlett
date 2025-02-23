import {Invoice, Issue} from './types';
import {SignJWT, jwtVerify, createRemoteJWKSet} from 'jose';
import fetch from 'node-fetch';
import {ValidationResponse} from './interfaces';

const QUERY_MAX_RESULTS: number = 5000;

interface FetchFromJiraParams {
  path: string;
  method: string;
  body?: string | object;
}

export class JiraClient {
  private token: string;
  private apiBaseUrl: string;

  constructor(token: string, apiBaseUrl: string) {
    this.token = token;
    this.apiBaseUrl = apiBaseUrl;
  }

  //Necesito asegurarme que al aplicarle un toString o stringify de un objeto de tipo JiraClient me devuelva el json correspondiente de su representación
  toString(): string {
    return JSON.stringify({
      token: this.token,
      apiBaseUrl: this.apiBaseUrl,
    });
  }

  static fromString(json: string): JiraClient {
    const {token, apiBaseUrl} = JSON.parse(json);
    return new JiraClient(token, apiBaseUrl);
  }

  private validateIssueKey(method: string, issueKey?: string): string | undefined {
    if (method.toLowerCase() === 'PUT' && !issueKey) {
      throw new Error('issueKey es requerido para editar un ticket');
    }
    return issueKey;
  }

  private isEdit(method: string): boolean {
    return method === 'PUT';
  }

  private async fetchFromJira({path, method, body}: FetchFromJiraParams) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
    if (typeof body === 'string') {
      headers['Content-Type'] = 'application/json';
    }
    return await fetch(`${this.apiBaseUrl}/rest/api${path}`, {
      headers,
      method,
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
  }

  async requestTicketsJira(payload: Partial<Invoice>) {
    const {method, key: issueKey, status} = payload;
    if (!method) return;

    const jiraRoute = this.isEdit(method)
      ? `/rest/api/3/issue/${this.validateIssueKey(method, issueKey)!}`
      : `/rest/api/3/issue`;

    const response = await this.fetchFromJira({
      path: jiraRoute,
      method: method,
      body: payload,
    });

    if (!response.ok) {
      throw new Error(
        `Error al ${method === 'POST' ? 'crear' : 'editar'} issue: ` +
          `${response.status} - ${await response.text()}`,
      );
    }

    if (response.status !== 204) {
      const data = await response.json();
      await this.transitionIssue(payload);
      return data;
    }

    return;
  }

  async getExistingIssues(query: string, fields: string[]): Promise<Issue[]> {
    const response = await this.fetchFromJira({
      path: `/rest/api/3/search`,
      method: 'POST',
      body: {
        fields: fields,
        jql: query,
        maxResults: QUERY_MAX_RESULTS,
      },
    });
    if (!response.ok) throw new Error(`Error Http: ${await response.text()}`);
    const data = await response.json();
    console.log(`GET EXISTING ISSUES RETURN ${JSON.stringify(data)}`);
    return data.issues;
  }

  private async transitionIssue(payload: Partial<Invoice>) {
    const {status, key: issueKey} = payload;

    if (!status || !issueKey) {
      throw new Error('Status and issueKey are required for transition');
    }

    // Si el estado que recibimos en el CSV es diferente al estado actual del ticket, entonces lo transicionamos
    const issues = await this.getExistingIssues(`key = ${issueKey}`, ['status']);
    if (!issues.length) {
      throw new Error(`Issue with key ${issueKey} not found`);
    }

    if (!issues[0].fields?.status?.name) {
      throw new Error(`Status field not found for issue ${issueKey}`);
    }

    const actualStatus = issues[0].fields.status.name;

    if (status.name !== actualStatus) {
      const response = await this.fetchFromJira({
        path: `/rest/api/3/issue/${issueKey}/transitions`,
        method: 'POST',
        body: {
          transition: {
            id: status.transitionId,
          },
        },
      });

      if (!response.ok) {
        throw new Error(
          `Error al transicionar issue: ${response.status} - ${await response.text()}`,
        );
      }
    }
  }
}
export async function validateContextToken(
  invocationToken: string,
  appId: string,
): Promise<ValidationResponse | undefined> {
  console.log('=== validateContextToken v2 ===');
  console.log('Input params:', {
    invocationToken: invocationToken?.substring(0, 10) + '...',
    appId,
  });

  const jwksUrl = 'https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json';
  console.log('JWKS URL:', jwksUrl);

  try {
    console.log('Creating JWKS...');
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    console.log('JWKS created successfully');

    console.log('Verifying token...');
    const audienceValue = `ari:cloud:ecosystem::app/${appId}`;
    console.log('Expected audience:', audienceValue);

    const {payload} = await jwtVerify(invocationToken, JWKS, {
      audience: audienceValue,
    });
    console.log('Token verified successfully');
    console.log('Payload received:', {
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
      iat: payload.iat,
    });

    return {
      app: payload.app as ValidationResponse['app'],
      context: payload.context as ValidationResponse['context'],
      principal: payload.principal as ValidationResponse['principal'],
      aud: payload.aud as string,
      exp: payload.exp as number,
      iat: payload.iat as number,
      iss: payload.iss as string,
      nbf: payload.nbf as number,
      jti: payload.jti as string,
    };
  } catch (e) {
    if (e instanceof Error) {
      console.error('=== validateContextToken Error ===');
      console.error('Error type:', e.constructor.name);
      console.error('Error message:', e.message);
      if (e.stack) console.error('Stack trace:', e.stack);
      return undefined;
    } else {
      throw e;
    }
  }
}
