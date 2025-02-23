import { jwtVerify, createRemoteJWKSet } from 'jose';
import fetch from 'node-fetch';
const QUERY_MAX_RESULTS = 5000;
export class JiraClient {
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
        if (method.toLowerCase() === 'PUT' && !issueKey) {
            throw new Error('issueKey es requerido para editar un ticket');
        }
        return issueKey;
    }
    isEdit(method) {
        return method === 'PUT';
    }
    async fetchFromJira({ path, method, body }) {
        const headers = {
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
    async requestTicketsJira(payload) {
        const { method, key: issueKey, status } = payload;
        if (!method)
            return;
        const jiraRoute = this.isEdit(method)
            ? `/rest/api/3/issue/${this.validateIssueKey(method, issueKey)}`
            : `/rest/api/3/issue`;
        const response = await this.fetchFromJira({
            path: jiraRoute,
            method: method,
            body: payload,
        });
        if (!response.ok) {
            throw new Error(`Error al ${method === 'POST' ? 'crear' : 'editar'} issue: ` +
                `${response.status} - ${await response.text()}`);
        }
        if (response.status !== 204) {
            const data = await response.json();
            await this.transitionIssue(payload);
            return data;
        }
        return;
    }
    async getExistingIssues(query, fields) {
        const response = await this.fetchFromJira({
            path: `/rest/api/3/search`,
            method: 'POST',
            body: {
                fields: fields,
                jql: query,
                maxResults: QUERY_MAX_RESULTS,
            },
        });
        if (!response.ok)
            throw new Error(`Error Http: ${await response.text()}`);
        const data = await response.json();
        console.log(`GET EXISTING ISSUES RETURN ${JSON.stringify(data)}`);
        return data.issues;
    }
    async transitionIssue(payload) {
        const { status, key: issueKey } = payload;
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
                throw new Error(`Error al transicionar issue: ${response.status} - ${await response.text()}`);
            }
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
        console.log('Creating JWKS...');
        const JWKS = createRemoteJWKSet(new URL(jwksUrl));
        console.log('JWKS created successfully');
        console.log('Verifying token...');
        const audienceValue = `ari:cloud:ecosystem::app/${appId}`;
        console.log('Expected audience:', audienceValue);
        const { payload } = await jwtVerify(invocationToken, JWKS, {
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
