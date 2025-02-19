import { parse, format } from 'date-fns';
export const scarlettMapping = {
    ["customfield_19899" /* CF.scarlett_id */]: (invoice) => [invoice.uuid || ''],
    ["customfield_17707" /* CF.pais */]: (invoice) => ({ value: invoice.pais || '' }),
    ["customfield_19888" /* CF.tipo_documento */]: (invoice) => invoice.tipo_documento || '',
    ["customfield_19889" /* CF.estado_validaciones */]: (invoice) => invoice.estado_validaciones || '',
    ["customfield_14357" /* CF.proveedor_id */]: (invoice) => invoice.proveedor_id || '',
    ["customfield_19891" /* CF.fecha_recepcion */]: (invoice) => parseAndFormatDate(invoice.fecha_recepcion || ''),
    ["customfield_19892" /* CF.asignacion_sap_sku */]: (invoice) => invoice.asignacion_sap_sku || '',
    ["customfield_19894" /* CF.estado_conciliacion */]: (invoice) => invoice.estado_conciliacion || '',
    ["customfield_19895" /* CF.estado_solicitudes */]: (invoice) => invoice.estado_solicitudes || '',
    ["customfield_16985" /* CF.orden_de_compra */]: (invoice) => invoice.orden_de_compra || '',
    ["customfield_19896" /* CF.fecha_emision */]: (invoice) => parseAndFormatDate(invoice.fecha_emision || ''),
    ["customfield_17745" /* CF.is */]: (invoice) => invoice.is || '',
    ["customfield_19897" /* CF.estado_de_envio */]: (invoice) => invoice.estado_de_envio || '',
    ["customfield_19195" /* CF.monto */]: (invoice) => parseInt(invoice.monto || '0'),
    ["customfield_18766" /* CF.uuid */]: (invoice) => [invoice.uuid || ''],
    ["customfield_19898" /* CF.estado_integracion_sap_final */]: (invoice) => invoice.estado_integracion_sap_final || '',
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
