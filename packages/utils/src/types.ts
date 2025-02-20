export const enum JobStatus {
    todo = "todo",
    inProgress = "inProgress",
    success = "success",
    failed = "failed",
    omit = "omit",
}
export const enum Appearance {
    default = "default",
    inProgress = "inProgress",
    moved = "moved",
    removed = "removed",
    success = "success",
}

export interface Job {
    id: string;
    ticket?: Partial<Issue> | undefined;
    status: JobStatus;
}

export type TicketStates = {
  created: number;
  edited: number;
  omited: number;
  error: number;
  projectId: number;
};

export type Invoice = {
    project: { id: number };
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
    status?: {
      name: string;
      transitionId: string;
  };
};

export type Issue = {
    key: string | undefined;
    fields: {
        project: { id: number };
        summary: string | undefined;
        issuetype: { id: number };
        status?: {
            name: string;
            transitionId: string;
        };
    } & CustomField;
};

type CustomField = {
    [key: `customfield_${number}`]:
        | string
        | number
        | (string | any)[]
        | { value: string | undefined }
        | { id: number | undefined }
        | undefined
        | [];
};
export interface RequestPayload {
    [x: string]: any;
    [x: number]: any;
}

export interface IssueOperationsFromCsvPayload extends RequestPayload {
    s3Key: string;
    projectId: number;
}

export interface GetJobsStatusPayload extends RequestPayload {
    jobsList: string[];
}

export interface GetIssueKeyPayload extends RequestPayload {
    id: string;
}

export interface GetIssueStatusPayload extends RequestPayload {
    issueKeys: string[];
}

export interface GetUploadUrlPayload extends RequestPayload {
    fileName: string;
}

export type OperationPayload = {
    method: "PUT" | "POST";
    key: string | undefined;
} & Partial<Invoice>;
