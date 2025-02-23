import {Issue, OperationPayload} from './types.js';
import {SignJWT, jwtVerify, createRemoteJWKSet} from 'jose';
import fetch from 'node-fetch';
import {ValidationResponse} from './interfaces.js';

const QUERY_MAX_RESULTS: number = 5000;

interface FetchFromJiraParams {
  path: string;
  method: string;
  body?: string;
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
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
    console.log(
      `Fetching from Jira with params: ${JSON.stringify(
        headers,
      )}, method: ${method}, body: ${JSON.stringify(body)}`,
    );
    const requestOptions = {
      headers,
      method,
      body,
    } as const;
    return fetch(`${this.apiBaseUrl}${path}`, requestOptions);
  }

  async sendRequest(payload: OperationPayload) {
    const {method, issue, change} = payload;
    if (!method) return;

    const jiraRoute = this.isEdit(method)
      ? `/rest/api/3/issue/${this.validateIssueKey(method, issue.key)!}`
      : `/rest/api/3/issue`;

    const response = await this.fetchFromJira({
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

    // if (response.status !== 204) {
    //   const data = await response.json();
    //   await this.transitionIssue(payload);
    //   return data;
    // }

    return;
  }

  async getExistingIssues(query: string, fields: string[]): Promise<Issue[]> {
    console.log(
      `query: ${query}, fields: ${fields.join(
        ',',
      )}, maxResults: ${QUERY_MAX_RESULTS}, apiBaseUrl: ${this.apiBaseUrl}, token: ${this.token}`,
    );
    try {
      const response = await this.fetchFromJira({
        path: `/rest/api/3/search/jql`,
        method: 'POST',
        body: JSON.stringify({
          fields,
          jql: query,
          maxResults: QUERY_MAX_RESULTS,
        }),
      });
      if (response.status !== 200) {
        console.log(`Error Http: ${response.status} - ${response.status !== 200}`);
        let text = await response.text();
        console.error(`Error Http: ${text}`);
        throw new Error(`Error Http: ${text}`);
      }

      const data = await response.json();
      console.log(`GET EXISTING ISSUES RETURN ${JSON.stringify(data)}`);
      return data.issues;
    } catch (error) {
      console.log(`Error getting existing issues: ${error}`);
      throw error;
    }
  }

  async transitionIssue(payload: OperationPayload) {
    const {
      change,
      issue: {key: issueKey},
    } = payload;

    if (change.type !== 'transition' || !change.transitionId || !issueKey) {
      throw new Error('TransitionId and issueKey are required for transition');
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

    
      const response = await this.fetchFromJira({
        path: `/rest/api/3/issue/${issueKey}/transitions`,
        method: 'POST',
        body: JSON.stringify({
          transition: {
            id: change.transitionId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Error al transicionar issue: ${response.status} - ${await response.text()}`,
        );
     
    }
    return {success: true};
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
