import {Issue, OperationPayload} from './types.js';
import {SignJWT, jwtVerify, createRemoteJWKSet} from 'jose';
import fetch from 'node-fetch';
import {ValidationResponse} from './interfaces.js';
import {
  SFNClient,
  DescribeExecutionCommand,
  DescribeMapRunCommand,
  DescribeExecutionCommandOutput,
  DescribeMapRunCommandOutput,
  ListMapRunsCommand,
  ListMapRunsCommandOutput,
  StartExecutionCommand,
  StartExecutionCommandOutput,
} from '@aws-sdk/client-sfn';

const QUERY_MAX_RESULTS: number = 5000;
const STATE_MACHINE_ARN =
  process.env.STATE_MACHINE_ARN ??
  'arn:aws:states:us-east-1:529202746267:stateMachine:scarlet-execution-machine';

interface FetchFromJiraParams {
  path: string;
  method: 'POST' | 'GET' | 'PUT';
  body?: string;
}

export class StateMachine {
  private sfnClient: SFNClient;
  private stateMachineArn: string;
  constructor() {
    this.stateMachineArn = STATE_MACHINE_ARN;
    this.sfnClient = new SFNClient({});
  }
  async getStatus(executionArn: string): Promise<DescribeExecutionCommandOutput> {
    const command = new DescribeExecutionCommand({
      executionArn: `arn:aws:states:us-east-1:529202746267:execution:${this.stateMachineArn}:scarlet-${executionArn}`,
      includedData: 'ALL_DATA',
    });
    const result = await this.sfnClient.send(command);
    console.log(`DescribeExecutionCommand: ${JSON.stringify(result.mapRunArn)}`);
    return result;
  }
  async getMapStatus(mapRunArn: string): Promise<DescribeMapRunCommandOutput> {
    const command = new DescribeMapRunCommand({mapRunArn});
    const result = await this.sfnClient.send(command);
    console.log(`DescribeExecutionMapRunCommand: ${JSON.stringify(result)}`);
    return result;
  }
  async listStateMachineMapRuns(arn: string): Promise<ListMapRunsCommandOutput> {
    const command = new ListMapRunsCommand({
      executionArn: `arn:aws:states:us-east-1:529202746267:execution:${this.stateMachineArn}:scarlet-${arn}`,
    });
    const result = await this.sfnClient.send(command);
    console.log(`ListMapRunsCommand: ${JSON.stringify(result)}`);
    return result;
  }
  async start(input: Record<string, any>): Promise<StartExecutionCommandOutput> {
    
    const {name, traceHeader, input: inputParam} = input;
    const message = new StartExecutionCommand({
      stateMachineArn: this.stateMachineArn,
      name,
      traceHeader,
      input: JSON.stringify(inputParam),
    });

    console.log('Step Function Message:', message);
    const machine = await this.sfnClient.send(message);
    console.log('Step Function Response:', machine);
    return machine;
  }
}

export class JiraClient {
  async validateIssues(ids: number[], jqls: string[]): Promise<number[]> {
    console.log(`Validating issues: ${ids},JQLs: ${jqls}`);
    if (!ids || ids.length === 0 || !jqls || jqls.length === 0) {
      const error: any = new Error('Issue IDs and JQLs are required');
      error.errorType = 'Lambda.InvalidInput';
      error.errorMessage = 'Issue IDs and JQLs are required';
      error.status = 400;
      throw error;
    }

    // fetchFromJira ahora maneja todos los errores HTTP y de red, incluyendo 429 y 503
    const response = await this.fetchFromJira({
      path: `/rest/api/3/jql/match`,
      method: 'POST',
      body: JSON.stringify({
        issueIds: ids,
        jqls,
      }),
    });

    try {
      const responseData = await response.json();
      const matches: {matchedIssues: number[]}[] = responseData.matches;
      console.log(`VALIDATE ISSUES RETURN ${JSON.stringify(matches)}`);

      if (!matches || !Array.isArray(matches)) {
        console.log('Invalid response format from Jira match API');
        return [];
      }

      const noAplicaList = ids.filter((id) =>
        matches.some((match) => match.matchedIssues.includes(id)),
      );
      return noAplicaList;
    } catch (error) {
      // Error al parsear la respuesta JSON
      console.error('Error parsing JSON response in validateIssues:', error);
      const formattedError: any = new Error('Error parsing JSON response from Jira');
      formattedError.errorType = 'Lambda.InvalidResponse';
      formattedError.errorMessage = 'Error parsing JSON response from Jira';
      formattedError.status = 500;
      throw formattedError;
    }
  }
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
    if (method.toUpperCase() === 'POST') {
      return;
    }
    if (!issueKey) {
      throw new Error('issueKey es requerido para editar un ticket');
    }
    return issueKey;
  }
  private async fetchFromJira({path, method, body}: FetchFromJiraParams) {
    try {
      const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      };
      console.log(
        `Fetching from Jira with params: ${JSON.stringify(headers)},path: ${
          this.apiBaseUrl
        }${path}, method: ${method}, body: ${body}`,
      );
      const requestOptions = {
        headers,
        method,
        body,
      } as const;

      const response = await fetch(`${this.apiBaseUrl}${path}`, requestOptions);

      // Manejo de respuestas no exitosas (HTTP status code >= 400)
      if (!response.ok) {
        // Manejo específico para errores de rate limit (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 60; // Default a 60 segundos
          console.log(`Rate limit exceeded. Retry-After: ${retryAfterSeconds} seconds`);

          // Crear un error estandarizado para la máquina de estados
          // const error: any = new Error(
          //   `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`,
          // );
          // Asegurar que tanto retryAfterSeconds como retrySeconds estén disponibles
          // Convertir explícitamente a número para evitar problemas de parsing
          const numericRetryAfter = Number(retryAfterSeconds);
          throw {
            type: 'Lambda.TooManyRequestsException',
            status: 429,
            message: `Rate limit exceeded. Retry after ${numericRetryAfter} seconds`,
            retryAfterSeconds: numericRetryAfter,
            retrySeconds: numericRetryAfter, // Este es el que usará directamente WaitForItemRateLimit
          };
        }

        // Manejo específico para errores de servicio no disponible (503)
        if (response.status === 503) {
          // Usar un tiempo de espera por defecto para 503
          const retryAfterSeconds = 60; // 1 minuto por defecto para errores 503

          console.log(
            `Service unavailable (503). Using default retry delay: ${retryAfterSeconds} seconds`,
          );

          // Crear un error estandarizado para la máquina de estados
          // Mismo enfoque para errores 503
          const numericRetryAfter = Number(retryAfterSeconds);
          throw {
            type: 'Lambda.ServiceUnavailable',
            status: 503,
            message: `Service unavailable. Retry after ${numericRetryAfter} seconds`,
            retryAfterSeconds: numericRetryAfter,
            retrySeconds: numericRetryAfter, // Consistente con el manejo del error 429
          };
        }

        // Para otros errores HTTP
        let errorBody: string;
        try {
          errorBody = await response.text();
        } catch (e) {
          // Si no podemos obtener el texto de respuesta, usamos un mensaje genérico
          errorBody = 'Unknown error';
        }
        throw {
          type: 'Lambda.HttpError',
          status: response.status,
          message: `HTTP error ${response.status}: ${errorBody}`,
        };
      }
      return response;
    } catch (error: any) {
      console.error('Error unexpected in fetchFromJira:', error);
      throw error;
    }
  }

  async sendRequest(payload: OperationPayload) {
    const {method, issue, change: change} = payload;
    console.log(`Sending request with payload: ${JSON.stringify(payload)}`);
    //Omitimos el envio si el metodo es undefined
    if (!method) {
      const error: any = new Error('Method is required');
      error.errorType = 'Lambda.InvalidInput';
      error.errorMessage = 'Method is required';
      error.status = 400;
      throw error;
    }

    // fetchFromJira ahora se encarga de manejar todos los errores HTTP y de red
    const response = await this.fetchFromJira({
      path: `/rest/api/3/issue/${this.validateIssueKey(method, issue.key) ?? ''}`,
      method: method,
      body: JSON.stringify({...issue, transition: {id: change.transitionId}}),
    });
    // Si llegamos aquí, la respuesta fue exitosa
    return {success: true, status: response.status};
  }

  async transitionIssue(issueKey: string, transitionId: number) {
    if (!issueKey) {
      const error: any = new Error('Issue key is required');
      error.errorType = 'Lambda.InvalidInput';
      error.errorMessage = 'Issue key is required';
      error.status = 400;
      throw error;
    }

    // fetchFromJira ahora maneja todos los errores HTTP y de red
    const response = await this.fetchFromJira({
      path: `/rest/api/3/issue/${issueKey}/transitions`,
      method: 'POST',
      body: JSON.stringify({transition: {id: transitionId}}),
    });

    // Si llegamos aquí, la respuesta fue exitosa
    return {success: true, status: response.status};
  }

  async getExistingIssues(query: string, fields: string[]): Promise<Issue[]> {
    console.log(
      `query: ${query}, fields: ${fields.join(
        ',',
      )}, maxResults: ${QUERY_MAX_RESULTS}, apiBaseUrl: ${this.apiBaseUrl}, token: ${this.token}`,
    );

    // fetchFromJira ahora maneja todos los errores HTTP y de red, incluyendo 429 y 503
    // Los errores 429 incluirán el valor de retryAfterSeconds como string para DynamoDB
    const response = await this.fetchFromJira({
      path: `/rest/api/3/search/jql`,
      method: 'POST',
      body: JSON.stringify({
        fields,
        jql: query,
        maxResults: QUERY_MAX_RESULTS,
      }),
    });

    try {
      const data = await response.json();
      console.log(`GET EXISTING ISSUES RETURN ${JSON.stringify(data)}`);
      if (!data.issues || !Array.isArray(data.issues)) {
        console.log('No issues found or invalid response format');
        return [];
      }
      return data.issues;
    } catch (error) {
      // Error al parsear la respuesta JSON
      console.error('Error parsing JSON response:', error);
      const formattedError: any = new Error('Error parsing JSON response from Jira');
      formattedError.errorType = 'Lambda.InvalidResponse';
      formattedError.errorMessage = 'Error parsing JSON response from Jira';
      formattedError.status = 500;
      throw formattedError;
    }
  }

  static async validateContextToken(
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
      const JWKS = createRemoteJWKSet(new URL(jwksUrl));

      const audienceValue = `ari:cloud:ecosystem::app/${appId}`;

      const {payload} = await jwtVerify(invocationToken, JWKS, {
        audience: audienceValue,
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
}
