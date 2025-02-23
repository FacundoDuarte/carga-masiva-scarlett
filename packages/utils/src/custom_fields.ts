import {parse, format} from 'date-fns';

export const enum CF {
  summary = 'summary',
  status = 'status',
  pais = 'customfield_17707',
  tipo_documento = 'customfield_19888',
  estado_validaciones = 'customfield_19889',
  proveedor = 'customfield_19890',
  proveedor_id = 'customfield_14357',
  fecha_recepcion = 'customfield_19891',
  asignacion_sap_sku = 'customfield_19892',
  estado_integracion_sap = 'customfield_19893',
  estado_conciliacion = 'customfield_19894',
  estado_solicitudes = 'customfield_19895',
  orden_de_compra = 'customfield_16985',
  fecha_emision = 'customfield_19896',
  is = 'customfield_17745',
  estado_de_envio = 'customfield_19897',
  monto = 'customfield_19195',
  estado_integracion_sap_final = 'customfield_19898',
  scarlett_id = 'customfield_19899',
  uuid = 'customfield_18766',
}

export const enum StatusName {
  EnProceso = 'En proceso',
  Done = 'Done',
  AprovacaoCompliance = 'Aprovação Compliance',
  EncursoFinops = 'En curso FinOps',
  Resolved = 'Resolved',
  Reopened = 'Reopened',
  Closed = 'Closed',

}

// Objeto para validación en runtime
export const ValidStatusNames = {
  EnProceso: 'En proceso',
  Done: 'Done',
  AprovacaoCompliance: 'Aprovação Compliance',
  EncursoFinops: 'En curso FinOps',
  Resolved: 'Resolved',
  Reopened: 'Reopened',
  Closed: 'Closed',
} as const;

export type ValidStatusType = (typeof ValidStatusNames)[keyof typeof ValidStatusNames];

export const enum CsvRowHeaders {
  pais = 'Pais',
  uuid = 'Número de documento',
  documentType = 'Tipo de documento',
  estadoDeValidaciones = 'Estado de validaciones',
  proveedor = 'Proveedor',
  proveedorId = 'Proveedor ID',
  fechaDeRecepcion = 'Fecha de recepción',
  asignacionSapSku = 'Asignación de SAP SKU',
  estadoDeConciliacion = 'Estado de conciliación',
  estadoDeLasSolicitudes = 'Estado de las solicitudes',
  ordenDeCompra = 'Orden de compra',
  fechaDeEmision = 'Fecha de emisión',
  numeroDeEnvio = 'Número de envío',
  estadoDeEnvio = 'Estado de envío',
  monto = 'Monto',
  estadoIntegracionSapFinal = 'Estado SAP',
  estadoEnJira = 'Estado en Jira',
  subEstadoEnJira = 'Sub - Estado en Jira',
}
export type CsvRow = Record<CsvRowHeaders, string>;

export const scarlettMapping: CustomFieldMapping = {
  [CF.scarlett_id]: (row: Partial<CsvRow>) => [row[CsvRowHeaders.uuid] || ''],
  [CF.pais]: (row: Partial<CsvRow>) => ({value: row[CsvRowHeaders.pais] || ''}),
  [CF.tipo_documento]: (row: Partial<CsvRow>) => row[CsvRowHeaders.documentType] || '',
  [CF.estado_validaciones]: (row: Partial<CsvRow>) => row[CsvRowHeaders.estadoDeValidaciones] || '',
  [CF.proveedor_id]: (row: Partial<CsvRow>) => row[CsvRowHeaders.proveedorId] || '',
  [CF.fecha_recepcion]: (row: Partial<CsvRow>) =>
    parseAndFormatDate(row[CsvRowHeaders.fechaDeRecepcion] || ''),
  [CF.asignacion_sap_sku]: (row: Partial<CsvRow>) => row[CsvRowHeaders.asignacionSapSku] || '',
  [CF.estado_conciliacion]: (row: Partial<CsvRow>) => row[CsvRowHeaders.estadoDeConciliacion] || '',
  [CF.estado_solicitudes]: (row: Partial<CsvRow>) =>
    row[CsvRowHeaders.estadoDeLasSolicitudes] || '',
  [CF.orden_de_compra]: (row: Partial<CsvRow>) => row[CsvRowHeaders.ordenDeCompra] || '',
  [CF.fecha_emision]: (row: Partial<CsvRow>) =>
    parseAndFormatDate(row[CsvRowHeaders.fechaDeEmision] || ''),
  [CF.is]: (row: Partial<CsvRow>) => row[CsvRowHeaders.numeroDeEnvio] || '',
  [CF.estado_de_envio]: (row: Partial<CsvRow>) => row[CsvRowHeaders.estadoDeEnvio] || '',
  [CF.monto]: (row: Partial<CsvRow>) => parseInt(row[CsvRowHeaders.monto] || '0'),
  [CF.uuid]: (row: Partial<CsvRow>) => [row[CsvRowHeaders.uuid] || ''],
  [CF.estado_integracion_sap_final]: (row: Partial<CsvRow>) =>
    row[CsvRowHeaders.estadoIntegracionSapFinal] || '',
};

export const statusMapping: TransitionMapping = {
  [StatusName.EnProceso]: 61,
  [StatusName.Done]: 81,
  [StatusName.AprovacaoCompliance]: 71,
  [StatusName.EncursoFinops]: 51,
  [StatusName.Resolved]: 31,
  [StatusName.Reopened]: 41,
  [StatusName.Closed]: 21,
};

export type TransitionMapping = {
  [key in StatusName]: number;
};

export type CustomFieldMapping = {
  [x in CF]?: (row: Partial<CsvRow>) => string | string[] | number | {id: number} | {value: string};
};

/**
 * Parsea una fecha a partir del formato de entrada y la retorna en el formato deseado.
 * @param dateString - La fecha en formato string.
 * @param inputFormat - El formato en el que se encuentra dateString (por defecto 'dd-MM-yyyy').
 * @param outputFormat - El formato de salida deseado (por defecto 'yyyy-MM-dd').
 * @returns La fecha formateada.
 */
function parseAndFormatDate(
  dateString: string,
  inputFormat: string = 'dd-MM-yyyy',
  outputFormat: string = 'yyyy-MM-dd',
): string {
  // Parsea la fecha a partir del formato de entrada
  const parsedDate = parse(dateString, inputFormat, new Date());

  // Retorna la fecha formateada según el formato de salida
  return format(parsedDate, outputFormat);
}

// Ejemplo de uso:
const fechaFormateada = parseAndFormatDate('22-01-2025');
