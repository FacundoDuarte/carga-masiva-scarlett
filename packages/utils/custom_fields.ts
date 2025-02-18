import {parse, format} from 'date-fns';
import { Invoice } from 'utils/types';
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
export type CsvRow = Record<CsvRowHeaders, string> & {
  pais: string;
  uuid: string;
  documentType: string;
  estadoDeValidaciones: string;
  proveedor: string;
  proveedorId: string;
  fechaDeRecepcion: string;
  asignacionSapSku: string;
  estadoDeConciliacion: string;
  estadoDeLasSolicitudes: string;
  ordenDeCompra: string;
  fechaDeEmision: string;
  numeroDeEnvio: string;
  estadoDeEnvio: string;
  monto: string;
  estadoIntegracionSapFinal: string;
  estadoEnJira: string;
  subEstadoEnJira: string;
};

export const scarlettMapping: Mapping = {
  [CF.scarlett_id]: (invoice: Partial<Invoice>) => [invoice.uuid || ''],
  [CF.pais]: (invoice: Partial<Invoice>) => ({ value: invoice.pais || '' }),
  [CF.tipo_documento]: (invoice: Partial<Invoice>) => invoice.tipo_documento || '',
  [CF.estado_validaciones]: (invoice: Partial<Invoice>) => invoice.estado_validaciones || '',
  [CF.proveedor_id]: (invoice: Partial<Invoice>) => invoice.proveedor_id || '',
  [CF.fecha_recepcion]: (invoice: Partial<Invoice>) => parseAndFormatDate(invoice.fecha_recepcion || ''),
  [CF.asignacion_sap_sku]: (invoice: Partial<Invoice>) => invoice.asignacion_sap_sku || '',
  [CF.estado_conciliacion]: (invoice: Partial<Invoice>) => invoice.estado_conciliacion || '',
  [CF.estado_solicitudes]: (invoice: Partial<Invoice>) => invoice.estado_solicitudes || '',
  [CF.orden_de_compra]: (invoice: Partial<Invoice>) => invoice.orden_de_compra || '',
  [CF.fecha_emision]: (invoice: Partial<Invoice>) => parseAndFormatDate(invoice.fecha_emision || ''),
  [CF.is]: (invoice: Partial<Invoice>) => invoice.is || '',
  [CF.estado_de_envio]: (invoice: Partial<Invoice>) => invoice.estado_de_envio || '',
  [CF.monto]: (invoice: Partial<Invoice>) => parseInt(invoice.monto || '0'),
  [CF.uuid]: (invoice: Partial<Invoice>) => [invoice.uuid || ''],
  [CF.estado_integracion_sap_final]: (invoice: Partial<Invoice>) => invoice.estado_integracion_sap_final || '',
};

export type Mapping = {
  [x in CF]?: (invoice: Partial<Invoice>) => string | string[] | number | { id: number } | { value: string };
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
