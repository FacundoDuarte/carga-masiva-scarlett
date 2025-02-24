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
        if (method.toUpperCase() === 'POST') {
            return;
        }
        if (!issueKey) {
            throw new Error('issueKey es requerido para editar un ticket');
        }
        return issueKey;
    }
    async fetchFromJira({ path, method, body }) {
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
        return fetch(`${this.apiBaseUrl}${path}`, requestOptions);
    }
    async sendRequest(payload) {
        const { method, issue, change } = payload;
        //Omitimos el envio si el metodo es undefined
        if (!method)
            return { success: true, status: 200 };
        const response = await this.fetchFromJira({
            path: `/rest/api/3/issue/${this.validateIssueKey(method, issue.key) ?? ''}`,
            method: method,
            body: JSON.stringify(change && change.transitionId
                ? { ...issue, transition: { id: change.transitionId } }
                : { ...issue }),
        });
        if (!response.ok) {
            throw new Error(`Error al ${method === 'POST' ? 'crear' : 'editar'} issue: ` +
                `${response.status} - ${await response.text()}`);
        }
        return { success: true, status: response.status };
    }
    async getExistingIssues(query, fields) {
        console.log(`query: ${query}, fields: ${fields.join(',')}, maxResults: ${QUERY_MAX_RESULTS}, apiBaseUrl: ${this.apiBaseUrl}, token: ${this.token}`);
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
        }
        catch (error) {
            console.log(`Error getting existing issues: ${error}`);
            throw error;
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
