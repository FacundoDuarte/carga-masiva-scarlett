import api, {route} from '@forge/api';
import {Invoice, Issue, QueryPayload} from './types';
import {AtlassianDocument, TextNode} from './types/atlassian-document';
import {CF} from './custom_fields';

const ISSUE_TYPE = 11871;
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

  const jsonBody: Issue = {
    key: issueKey,
    fields: {
      project: {id: payload.projectId},
      summary: payload.summary,
      [CF.pais]: {value: payload.pais},
      [CF.uuid]: payload.uuid,
      [CF.tipo_documento]: payload.tipo_documento,
      [CF.estado_validaciones]: payload.estado_validaciones,
      [CF.proveedor_id]: payload.proveedor_id,
      [CF.fecha_recepcion]: payload.fecha_recepcion,
      [CF.asignacion_sap_sku]: payload.asignacion_sap_sku,
      [CF.estado_integracion_sap]: payload.estado_integracion_sap,
      [CF.estado_conciliacion]: payload.estado_conciliacion,
      [CF.estado_solicitudes]: payload.estado_solicitudes,
      [CF.orden_de_compra]: payload.orden_de_compra,
      [CF.fecha_emision]: payload.fecha_emision,
      [CF.is]: payload.is,
      [CF.estado_de_envio]: payload.estado_de_envio,
      [CF.monto]: Number(payload.monto),
      [CF.estado_integracion_sap_final]: payload.estado_integracion_sap_final,
      [CF.scarlett_id]: [payload.scarlettId],
      issuetype: {id: ISSUE_TYPE},
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

export async function getExistingIssues(query: string, fields: string): Promise<Issue[]> {
  const response = await api
    .asApp()
    .requestJira(
      route`/rest/api/3/search/jql?jql=${query}&fields=${fields}&maxResults=${QUERY_MAX_RESULTS}`,
      {
        method: 'GET',
      },
    );
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
