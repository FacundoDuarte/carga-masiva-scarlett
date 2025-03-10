import {parse, isValid, format} from 'date-fns';

export const enum CF {
  summary = 'summary', 
  status = 'status', 
  pais = 'customfield_17707', 
  is = 'customfield_17745', 
  proveedor_id = 'customfield_14357', 
  correo_proveedor = 'customfield_18668', 
  nombre_proveedor_sap = 'customfield_17710', 
  uuid = 'customfield_18766', 
  orden_de_compra = 'customfield_16985',
  numero_factura = 'customfield_17712',
  monto = 'customfield_19195',
  monto_diferencia = 'customfield_18667',
  scarlett_id = 'customfield_19899',
  estado_conciliacion = 'customfield_19894',
  asignacion_sap_sku = 'customfield_19892',
  fecha_emision = 'customfield_19896',
  fecha_recepcion = 'customfield_19891',
  estado_integracion_sap = 'customfield_19893',
  estado_de_envio = 'customfield_19897',
  estado_validaciones = 'customfield_19889',
  estado_solicitudes = 'customfield_19895',
  sub_estado_en_jira = 'customfield_20977',
}
//Pasame todos los textos de StatusName a minuscula
export const enum StatusName {
  Abierto = 'abierto',
  EnCursoAgenteRecepciones = 'en curso agente recepciones',
  PendingProveedor = 'pending proveedor',
  Rechazado = 'rechazado',
  EncursoFinops = 'en curso finops',
  EnAnalisisInboundOps = 'en analisis inbound ops',
  EnCursoInStock = 'en curso in stock',
  EnAnalisisComercial = 'en analisis comercial',
  Done = 'done',
  ApprovalComercial = 'approval comercial',
  ApprovalFyC = 'approval f&c',
}

// Objeto para validación en runtime
export const ValidStatusNames = {
  Abierto: 'abierto',
  EnCursoAgenteRecepciones: 'en curso agente recepciones',
  PendingProveedor: 'pending proveedor',
  Rechazado: 'rechazado',
  EncursoFinops: 'en curso finops',
  EnAnalisisInboundOps: 'en analisis inbound ops',
  EnCursoInStock: 'en curso in stock',
  EnAnalisisComercial: 'en analisis comercial',
  Done: 'done',
  ApprovalComercial: 'approval comercial',
  ApprovalFyC: 'approval f&c',
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
  [CF.pais]: (row: Partial<CsvRow>) => ({value: row[CsvRowHeaders.pais] || ''}),
  [CF.uuid]: (row: Partial<CsvRow>) => row[CsvRowHeaders.uuid] || '',
  [CF.scarlett_id]: (row: Partial<CsvRow>) => [row[CsvRowHeaders.uuid] || ''],
  [CF.estado_validaciones]: (row: Partial<CsvRow>) => row[CsvRowHeaders.estadoDeValidaciones] || '',
  [CF.nombre_proveedor_sap]: (row: Partial<CsvRow>) => row[CsvRowHeaders.proveedor] || '',
  [CF.proveedor_id]: (row: Partial<CsvRow>) => row[CsvRowHeaders.proveedorId] || '',
  [CF.fecha_recepcion]: (row: Partial<CsvRow>) =>
    parseAndFormatDate(row[CsvRowHeaders.fechaDeRecepcion] || ''),
  [CF.orden_de_compra]: (row: Partial<CsvRow>) => row[CsvRowHeaders.ordenDeCompra] || '',
  [CF.fecha_emision]: (row: Partial<CsvRow>) =>
    parseAndFormatDate(row[CsvRowHeaders.fechaDeEmision] || ''),
  [CF.is]: (row: Partial<CsvRow>) => row[CsvRowHeaders.numeroDeEnvio] || '',
  [CF.monto]: (row: Partial<CsvRow>) => parseInt(row[CsvRowHeaders.monto] || '0'),
  [CF.estado_de_envio]: (row: Partial<CsvRow>) => row[CsvRowHeaders.estadoDeEnvio] || '',
  [CF.estado_integracion_sap]: (row: Partial<CsvRow>) =>
    row[CsvRowHeaders.estadoIntegracionSapFinal] || '',
  [CF.asignacion_sap_sku]: (row: Partial<CsvRow>) => row[CsvRowHeaders.asignacionSapSku] || '',
  [CF.estado_conciliacion]: (row: Partial<CsvRow>) => row[CsvRowHeaders.estadoDeConciliacion] || '',
  [CF.estado_solicitudes]: (row: Partial<CsvRow>) =>
    row[CsvRowHeaders.estadoDeLasSolicitudes] || '',
  [CF.sub_estado_en_jira]: (row: Partial<CsvRow>) => row[CsvRowHeaders.subEstadoEnJira] || '',
};

export const statusMapping: TransitionMapping = {
  [StatusName.Abierto]: 461,
  [StatusName.EnCursoAgenteRecepciones]: 411,
  [StatusName.PendingProveedor]: 451,
  [StatusName.Rechazado]: 11,
  [StatusName.EncursoFinops]: 331,
  [StatusName.EnAnalisisInboundOps]: 441,
  [StatusName.EnCursoInStock]: 431,
  [StatusName.EnAnalisisComercial]: 421,
  [StatusName.Done]: 231,
  [StatusName.ApprovalComercial]: 371,
  [StatusName.ApprovalFyC]: 361,
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
 * @param possibleFormats - Lista de formatos posibles para la fecha.
 * @param outputFormat - El formato de salida deseado (por defecto 'yyyy-MM-dd').
 * @returns La fecha formateada.
 */
function parseAndFormatDate(
  dateString: string,
  possibleFormats: string[] = ['dd-MM-yyyy', 'yyyy-MM-dd', 'MM/ /yyyy', 'dd/MM/yyyy'],
  outputFormat: string = 'yyyy-MM-dd',
): string {
  // Intentar cada formato hasta encontrar uno válido
  for (const formatString of possibleFormats) {
    try {
      const parsedDate = parse(dateString, formatString, new Date());
      // Verificar si la fecha es válida
      if (isValid(parsedDate)) {
        return format(parsedDate, outputFormat);
      }
    } catch {
      // Continuar con el siguiente formato si hay error
      continue;
    }
  }
  // Si ninguno de los formatos funciona, lanzar error
  throw new Error(
    `No se pudo parsear la fecha '${dateString}' con ninguno de los formatos disponibles`,
  );
}
