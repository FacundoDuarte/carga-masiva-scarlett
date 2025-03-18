import { jwtVerify, createRemoteJWKSet } from 'jose';
import fetch from 'node-fetch';
import { SFNClient, DescribeExecutionCommand, DescribeMapRunCommand, ListMapRunsCommand, } from '@aws-sdk/client-sfn';
const sfnClient = new SFNClient({});
const QUERY_MAX_RESULTS = 5000;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN ??
    'arn:aws:states:us-east-1:529202746267:stateMachine:scarlet-execution-machine';
export class SSM {
    async getStateMachineStatus(executionArn) {
        const command = new DescribeExecutionCommand({
            executionArn: `arn:aws:states:us-east-1:529202746267:execution:scarlet-execution-machine:scarlet-${executionArn}`,
            includedData: 'ALL_DATA',
        });
        const result = await sfnClient.send(command);
        console.log(`DescribeExecutionCommand: ${JSON.stringify(result.mapRunArn)}`);
        return result;
    }
    async getStateMachineMapRunStatus(mapRunArn) {
        const command = new DescribeMapRunCommand({ mapRunArn });
        const result = await sfnClient.send(command);
        console.log(`DescribeExecutionMapRunCommand: ${JSON.stringify(result)}`);
        return result;
    }
    async listStateMachineMapRuns(arn) {
        const command = new ListMapRunsCommand({
            executionArn: `arn:aws:states:us-east-1:529202746267:execution:scarlet-execution-machine:scarlet-${arn}`,
        });
        const result = await sfnClient.send(command);
        console.log(`ListMapRunsCommand: ${JSON.stringify(result)}`);
        return result;
    }
}
export class JiraClient {
    async validateIssues(ids, jqls) {
        if (!ids || ids.length === 0 || !jqls || jqls.length === 0) {
            const error = new Error('Issue IDs and JQLs are required');
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
            const matches = responseData.matches;
            console.log(`VALIDATE ISSUES RETURN ${JSON.stringify(matches)}`);
            if (!matches || !Array.isArray(matches)) {
                console.log('Invalid response format from Jira match API');
                return [];
            }
            const noAplicaList = ids.filter((id) => matches.some((match) => match.matchedIssues.includes(id)));
            return noAplicaList;
        }
        catch (error) {
            // Error al parsear la respuesta JSON
            console.error('Error parsing JSON response in validateIssues:', error);
            const formattedError = new Error('Error parsing JSON response from Jira');
            formattedError.errorType = 'Lambda.InvalidResponse';
            formattedError.errorMessage = 'Error parsing JSON response from Jira';
            formattedError.status = 500;
            throw formattedError;
        }
    }
    token;
    apiBaseUrl;
    constructor(token, apiBaseUrl) {
        this.token = token;
        this.apiBaseUrl = apiBaseUrl;
    }
    //Necesito asegurarme que al aplicarle un toString o stringify de un objeto de tipo JiraClient me devuelva el json correspondiente de su representación
    toString() {
        return JSON.stringify({
            token: this.token,
            apiBaseUrl: this.apiBaseUrl,
        });
    }
    static fromString(json) {
        const { token, apiBaseUrl } = JSON.parse(json);
        return new JiraClient(token, apiBaseUrl);
    }
    validateIssueKey(method, issueKey) {
        if (method.toUpperCase() === 'POST') {
            return;
        }
        if (!issueKey) {
            throw new Error('issueKey es requerido para editar un ticket');
        }
        return issueKey;
    }
    async fetchFromJira({ path, method, body }) {
        try {
            const headers = {
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            };
            console.log(`Fetching from Jira with params: ${JSON.stringify(headers)},path: ${this.apiBaseUrl}${path}, method: ${method}, body: ${body}`);
            const requestOptions = {
                headers,
                method,
                body,
            };
            const response = await fetch(`${this.apiBaseUrl}${path}`, requestOptions);
            // Manejo de respuestas no exitosas (HTTP status code >= 400)
            if (!response.ok) {
                // Manejo específico para errores de rate limit (429)
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 60; // Default a 60 segundos
                    console.log(`Rate limit exceeded. Retry-After: ${retryAfterSeconds} seconds`);
                    // Crear un error estandarizado para la máquina de estados
                    const error = new Error(`Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`);
                    error.errorType = 'Lambda.TooManyRequestsException';
                    error.errorMessage = `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`;
                    error.status = 429;
                    error.retryAfterSeconds = retryAfterSeconds;
                    throw error;
                }
                // Manejo específico para errores de servicio no disponible (503)
                if (response.status === 503) {
                    // Usar un tiempo de espera por defecto para 503
                    const retryAfterSeconds = 60; // 1 minuto por defecto para errores 503
                    console.log(`Service unavailable (503). Using default retry delay: ${retryAfterSeconds} seconds`);
                    // Crear un error estandarizado para la máquina de estados
                    const error = new Error(`Service unavailable. Retry after ${retryAfterSeconds} seconds`);
                    error.errorType = 'Lambda.ServiceUnavailable';
                    error.errorMessage = `Service unavailable. Retry after ${retryAfterSeconds} seconds`;
                    error.status = 503;
                    error.retryAfterSeconds = retryAfterSeconds;
                    throw error;
                }
                // Para otros errores HTTP
                let errorBody = 'Unknown error';
                try {
                    errorBody = await response.text();
                }
                catch (e) {
                    // Si no podemos obtener el texto de respuesta, usamos un mensaje genérico
                }
                const error = new Error(`HTTP error ${response.status}: ${errorBody}`);
                error.status = response.status;
                error.errorType = 'Lambda.HttpError';
                error.errorMessage = `HTTP error ${response.status}: ${errorBody}`;
                throw error;
            }
            return response;
        }
        catch (error) {
            // Si ya tiene un formato de error estandarizado, solo lo propagamos
            if (error.errorType) {
                throw error;
            }
            // Para cualquier otro error inesperado (de red, etc.)
            console.error('Error unexpected in fetchFromJira:', error);
            const formattedError = new Error(error.message || String(error));
            formattedError.errorType = 'Lambda.NetworkError';
            formattedError.errorMessage = error.message || String(error);
            formattedError.status = error.status || 500;
            throw formattedError;
        }
    }
    async sendRequest(payload) {
        const { method, issue, change } = payload;
        console.log(`Sending request with payload: ${JSON.stringify(payload)}`);
        //Omitimos el envio si el metodo es undefined
        if (!method) {
            const error = new Error('Method is required');
            error.errorType = 'Lambda.InvalidInput';
            error.errorMessage = 'Method is required';
            error.status = 400;
            throw error;
        }
        // fetchFromJira ahora se encarga de manejar todos los errores HTTP y de red
        const response = await this.fetchFromJira({
            path: `/rest/api/3/issue/${this.validateIssueKey(method, issue.key) ?? ''}`,
            method: method,
            body: JSON.stringify(method === 'POST' && change && change.transitionId
                ? { ...issue, transition: { id: `${change.transitionId}` } }
                : { ...issue }),
        });
        // Si llegamos aquí, la respuesta fue exitosa
        return { success: true, status: response.status };
    }
    async transitionIssue(issueKey, transitionId) {
        if (!issueKey) {
            const error = new Error('Issue key is required');
            error.errorType = 'Lambda.InvalidInput';
            error.errorMessage = 'Issue key is required';
            error.status = 400;
            throw error;
        }
        // fetchFromJira ahora maneja todos los errores HTTP y de red
        const response = await this.fetchFromJira({
            path: `/rest/api/3/issue/${issueKey}/transitions`,
            method: 'POST',
            body: JSON.stringify({ transition: { id: transitionId } }),
        });
        // Si llegamos aquí, la respuesta fue exitosa
        return { success: true, status: response.status };
    }
    async getExistingIssues(query, fields) {
        console.log(`query: ${query}, fields: ${fields.join(',')}, maxResults: ${QUERY_MAX_RESULTS}, apiBaseUrl: ${this.apiBaseUrl}, token: ${this.token}`);
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
        }
        catch (error) {
            // Error al parsear la respuesta JSON
            console.error('Error parsing JSON response:', error);
            const formattedError = new Error('Error parsing JSON response from Jira');
            formattedError.errorType = 'Lambda.InvalidResponse';
            formattedError.errorMessage = 'Error parsing JSON response from Jira';
            formattedError.status = 500;
            throw formattedError;
        }
    }
}
export async function validateContextToken(invocationToken, appId) {
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
        const { payload } = await jwtVerify(invocationToken, JWKS, {
            audience: audienceValue,
        });
        return {
            app: payload.app,
            context: payload.context,
            principal: payload.principal,
            aud: payload.aud,
            exp: payload.exp,
            iat: payload.iat,
            iss: payload.iss,
            nbf: payload.nbf,
            jti: payload.jti,
        };
    }
    catch (e) {
        if (e instanceof Error) {
            console.error('=== validateContextToken Error ===');
            console.error('Error type:', e.constructor.name);
            console.error('Error message:', e.message);
            if (e.stack)
                console.error('Stack trace:', e.stack);
            return undefined;
        }
        else {
            throw e;
        }
    }
}
