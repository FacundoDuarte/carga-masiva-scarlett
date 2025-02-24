import { parse, format } from 'date-fns';
// Objeto para validación en runtime
export const ValidStatusNames = {
    EnProceso: 'En Proceso',
    Done: 'Done',
    AprovacaoCompliance: 'Aprovação Compliance',
    EncursoFinops: 'En curso FinOps',
    Resolved: 'Resolved',
    Reopened: 'Reopened',
    Closed: 'Closed',
};
export const scarlettMapping = {
    ["customfield_19899" /* CF.scarlett_id */]: (row) => [row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */] || ''],
    ["customfield_17707" /* CF.pais */]: (row) => ({ value: row["Pais" /* CsvRowHeaders.pais */] || '' }),
    ["customfield_19888" /* CF.tipo_documento */]: (row) => row["Tipo de documento" /* CsvRowHeaders.documentType */] || '',
    ["customfield_19889" /* CF.estado_validaciones */]: (row) => row["Estado de validaciones" /* CsvRowHeaders.estadoDeValidaciones */] || '',
    ["customfield_14357" /* CF.proveedor_id */]: (row) => row["Proveedor ID" /* CsvRowHeaders.proveedorId */] || '',
    ["customfield_19891" /* CF.fecha_recepcion */]: (row) => parseAndFormatDate(row["Fecha de recepci\u00F3n" /* CsvRowHeaders.fechaDeRecepcion */] || ''),
    ["customfield_19892" /* CF.asignacion_sap_sku */]: (row) => row["Asignaci\u00F3n de SAP SKU" /* CsvRowHeaders.asignacionSapSku */] || '',
    ["customfield_19894" /* CF.estado_conciliacion */]: (row) => row["Estado de conciliaci\u00F3n" /* CsvRowHeaders.estadoDeConciliacion */] || '',
    ["customfield_19895" /* CF.estado_solicitudes */]: (row) => row["Estado de las solicitudes" /* CsvRowHeaders.estadoDeLasSolicitudes */] || '',
    ["customfield_16985" /* CF.orden_de_compra */]: (row) => row["Orden de compra" /* CsvRowHeaders.ordenDeCompra */] || '',
    ["customfield_19896" /* CF.fecha_emision */]: (row) => parseAndFormatDate(row["Fecha de emisi\u00F3n" /* CsvRowHeaders.fechaDeEmision */] || ''),
    ["customfield_17745" /* CF.is */]: (row) => row["N\u00FAmero de env\u00EDo" /* CsvRowHeaders.numeroDeEnvio */] || '',
    ["customfield_19897" /* CF.estado_de_envio */]: (row) => row["Estado de env\u00EDo" /* CsvRowHeaders.estadoDeEnvio */] || '',
    ["customfield_19195" /* CF.monto */]: (row) => parseInt(row["Monto" /* CsvRowHeaders.monto */] || '0'),
    ["customfield_18766" /* CF.uuid */]: (row) => [row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */] || ''],
    ["customfield_19898" /* CF.estado_integracion_sap_final */]: (row) => row["Estado SAP" /* CsvRowHeaders.estadoIntegracionSapFinal */] || '',
};
export const statusMapping = {
    ["En Proceso" /* StatusName.EnProceso */]: 61,
    ["Done" /* StatusName.Done */]: 81,
    ["Aprova\u00E7\u00E3o Compliance" /* StatusName.AprovacaoCompliance */]: 71,
    ["En curso FinOps" /* StatusName.EncursoFinops */]: 51,
    ["Resolved" /* StatusName.Resolved */]: 31,
    ["Reopened" /* StatusName.Reopened */]: 41,
    ["Closed" /* StatusName.Closed */]: 21,
};
/**
 * Parsea una fecha a partir del formato de entrada y la retorna en el formato deseado.
 * @param dateString - La fecha en formato string.
 * @param inputFormat - El formato en el que se encuentra dateString (por defecto 'dd-MM-yyyy').
 * @param outputFormat - El formato de salida deseado (por defecto 'yyyy-MM-dd').
 * @returns La fecha formateada.
 */
function parseAndFormatDate(dateString, inputFormat = 'dd-MM-yyyy', outputFormat = 'yyyy-MM-dd') {
    // Parsea la fecha a partir del formato de entrada
    const parsedDate = parse(dateString, inputFormat, new Date());
    // Retorna la fecha formateada según el formato de salida
    return format(parsedDate, outputFormat);
}
// Ejemplo de uso:
const fechaFormateada = parseAndFormatDate('22-01-2025');
