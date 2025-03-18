import { parse, isValid, format } from 'date-fns';
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
    EnProcesamiento: 'en procesamiento',
};
export const scarlettMapping = {
    ["customfield_17707" /* CF.pais */]: (row) => ({ value: row["Pais" /* CsvRowHeaders.pais */] || '' }),
    ["customfield_18766" /* CF.uuid */]: (row) => row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */] || '',
    ["customfield_19899" /* CF.scarlett_id */]: (row) => [row["N\u00FAmero de documento" /* CsvRowHeaders.uuid */] || ''],
    ["customfield_19889" /* CF.estado_validaciones */]: (row) => row["Estado de validaciones" /* CsvRowHeaders.estadoDeValidaciones */] || '',
    ["customfield_17710" /* CF.nombre_proveedor_sap */]: (row) => row["Proveedor" /* CsvRowHeaders.proveedor */] || '',
    ["customfield_14357" /* CF.proveedor_id */]: (row) => row["Proveedor ID" /* CsvRowHeaders.proveedorId */] || '',
    ["customfield_19891" /* CF.fecha_recepcion */]: (row) => row["Fecha de recepci\u00F3n" /* CsvRowHeaders.fechaDeRecepcion */]
        ? parseAndFormatDate(row["Fecha de recepci\u00F3n" /* CsvRowHeaders.fechaDeRecepcion */])
        : undefined,
    ["customfield_16985" /* CF.orden_de_compra */]: (row) => row["Orden de compra" /* CsvRowHeaders.ordenDeCompra */] || undefined,
    ["customfield_19896" /* CF.fecha_emision */]: (row) => row["Fecha de emisi\u00F3n" /* CsvRowHeaders.fechaDeEmision */] ? parseAndFormatDate(row["Fecha de emisi\u00F3n" /* CsvRowHeaders.fechaDeEmision */]) : undefined,
    ["customfield_17745" /* CF.is */]: (row) => row["N\u00FAmero de env\u00EDo" /* CsvRowHeaders.numeroDeEnvio */] || undefined,
    ["customfield_19195" /* CF.monto */]: (row) => parseInt(row["Monto" /* CsvRowHeaders.monto */] || '0'),
    ["customfield_19897" /* CF.estado_de_envio */]: (row) => row["Estado de env\u00EDo" /* CsvRowHeaders.estadoDeEnvio */] || '',
    ["customfield_19893" /* CF.estado_integracion_sap */]: (row) => row["Estado SAP" /* CsvRowHeaders.estadoSap */] || '',
    ["customfield_19892" /* CF.asignacion_sap_sku */]: (row) => row["Asignaci\u00F3n de SAP SKU" /* CsvRowHeaders.asignacionSapSku */] || '',
    ["customfield_19894" /* CF.estado_conciliacion */]: (row) => row["Estado de conciliaci\u00F3n" /* CsvRowHeaders.estadoDeConciliacion */] || '',
    ["customfield_19895" /* CF.estado_solicitudes */]: (row) => row["Estado de las solicitudes" /* CsvRowHeaders.estadoDeLasSolicitudes */] || '',
    ["customfield_20977" /* CF.sub_estado_en_jira */]: (row) => row["Sub - Estado en Jira" /* CsvRowHeaders.subEstadoEnJira */] || '',
    ["customfield_14142" /* CF.nombre_del_proveedor */]: (row) => row["Proveedor" /* CsvRowHeaders.proveedor */] || '',
};
export const statusMapping = {
    ["abierto" /* StatusName.Abierto */]: 461,
    ["en curso agente recepciones" /* StatusName.EnCursoAgenteRecepciones */]: 411,
    ["pending proveedor" /* StatusName.PendingProveedor */]: 451,
    ["rechazado" /* StatusName.Rechazado */]: 11,
    ["en curso finops" /* StatusName.EncursoFinops */]: 331,
    ["en analisis inbound ops" /* StatusName.EnAnalisisInboundOps */]: 441,
    ["en curso in stock" /* StatusName.EnCursoInStock */]: 431,
    ["en analisis comercial" /* StatusName.EnAnalisisComercial */]: 421,
    ["done" /* StatusName.Done */]: 231,
    ["approval comercial" /* StatusName.ApprovalComercial */]: 371,
    ["approval f&c" /* StatusName.ApprovalFyC */]: 361,
    ["en procesamiento" /* StatusName.EnProcesamiento */]: 471,
};
/**
 * Parsea una fecha a partir del formato de entrada y la retorna en el formato deseado.
 * @param dateString - La fecha en formato string.
 * @param possibleFormats - Lista de formatos posibles para la fecha.
 * @param outputFormat - El formato de salida deseado (por defecto 'yyyy-MM-dd').
 * @returns La fecha formateada.
 */
function parseAndFormatDate(dateString, possibleFormats = ['dd-MM-yyyy', 'yyyy-MM-dd', 'MM/ /yyyy', 'dd/MM/yyyy'], outputFormat = 'yyyy-MM-dd') {
    // Intentar cada formato hasta encontrar uno válido
    for (const formatString of possibleFormats) {
        try {
            const parsedDate = parse(dateString, formatString, new Date());
            // Verificar si la fecha es válida
            if (isValid(parsedDate)) {
                return format(parsedDate, outputFormat);
            }
        }
        catch {
            // Continuar con el siguiente formato si hay error
            continue;
        }
    }
    // Si ninguno de los formatos funciona, lanzar error
    throw new Error(`No se pudo parsear la fecha '${dateString}' con ninguno de los formatos disponibles`);
}
