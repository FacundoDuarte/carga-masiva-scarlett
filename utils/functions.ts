import api, {route} from '@forge/api';
import {Invoice, Issue, QueryPayload} from './types';

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

  // const jsonBody: Issue = {
  //   key: issueKey,
  //   fields: {
  //     project: {id: payload.projectId},
  //     summary: payload.summary,
  //     [CF.pais]: {value: payload.pais},
  //     [CF.tipo_documento]: payload.tipo_documento,
  //     [CF.estado_validaciones]: payload.estado_validaciones,
  //     [CF.proveedor_id]: payload.proveedor_id,
  //     [CF.fecha_recepcion]: payload.fecha_recepcion,
  //     [CF.asignacion_sap_sku]: payload.asignacion_sap_sku,
  //     [CF.estado_integracion_sap]: payload.estado_integracion_sap,
  //     [CF.estado_conciliacion]: payload.estado_conciliacion,
  //     [CF.estado_solicitudes]: payload.estado_solicitudes,
  //     [CF.orden_de_compra]: payload.orden_de_compra,
  //     [CF.fecha_emision]: payload.fecha_emision,
  //     [CF.is]: payload.is,
  //     [CF.estado_de_envio]: payload.estado_de_envio,
  //     [CF.monto]: Number(payload.monto),
  //     [CF.estado_integracion_sap_final]: payload.estado_integracion_sap_final,
  //     [CF.scarlett_id]: [payload.scarlettId],
  //     issuetype: {id: ISSUE_TYPE},
  //     ...Object.fromEntries(
  //       Object.entries(scarlettMapping).map(([cfField, mapFunction]) => [
  //         cfField,
  //         mapFunction(payload),
  //       ])
  //     ),
  //   },
  // };

  const response = await api.asApp().requestJira(jiraRoute, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
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
    console.log(`Respuesta al ${method}:`, data);
    return data;
  }
  console.log(`Operación ${method} exitosa sin contenido (204)`);
  return;
};

export async function getExistingIssues(query: string, fields: string[]): Promise<Issue[]> {
  console.log(`GET EXISTING ISSUES :${query}, ${fields}`);

  const response = await api.asApp().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    body: JSON.stringify({
      fields: fields,
      jql: query,
      maxResults: QUERY_MAX_RESULTS,
    }),
  });
  if (!response.ok) throw new Error(`Error Http: ${await response.text()}`);
  const data = (await response.json()) as QueryPayload;
  console.log(`GET EXISTING ISSUES RETURN ${JSON.stringify(data)}`);

  return data.issues;
}
