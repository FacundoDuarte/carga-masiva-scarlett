export const enum JobStatus {
  todo = 'todo',
  inProgress = 'inProgress',
  success = 'success',
  failed = 'failed',
}

export interface Job {
  id: string;
  ticket: Partial<Invoice> | undefined;
  status: JobStatus;
}

export type Invoice = {
  projectId: number;
  summary: string;
  pais: string;
  uuid: string;
  tipo_documento: string;
  estado_validaciones: string;
  proveedor: string;
  proveedor_id: string;
  fecha_recepcion: string;
  asignacion_sap_sku: string;
  estado_integracion_sap: string;
  estado_conciliacion: string;
  estado_solicitudes: string;
  orden_de_compra: string;
  fecha_emision: string;
  is: string;
  estado_de_envio: string;
  monto: string;
  estado_integracion_sap_final: string;
  scarlettId: string;
  method: string;
  key?: string;
  status?: {name: string, statusCategory: {key: string, name: string}};
};

export type Issue = {
  key: string | undefined;
  fields: {
    project: {id: number};
    summary: string | undefined;
    issuetype: {id: number};
    status?: {statusCategory: {key: string, name: string}}
  } & CustomField;
};
type CustomField = {
  [key: `customfield_${number}`]:
    | string
    | number
    | (string | any)[]
    | {value: string | undefined}
    | {id: number | undefined}
    | undefined
    | [];
};
