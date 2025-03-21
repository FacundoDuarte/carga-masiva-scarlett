import {CsvRow, CsvRowHeaders} from '/opt/utils/index.js';

const ISSUE_TYPE_ID = 11504;

// Enum para caracteres especiales y sus reemplazos
enum SpecialCharCodes {
  // Caracteres especiales comunes
  UNKNOWN_CHAR = '\ufffd',
  LOWERCASE_A_ACCENT = '\u00e1', // á
  LOWERCASE_E_ACCENT = '\u00e9', // é
  LOWERCASE_I_ACCENT = '\u00ed', // í
  LOWERCASE_O_ACCENT = '\u00f3', // ó
  LOWERCASE_U_ACCENT = '\u00fa', // ú
  LOWERCASE_N_TILDE = '\u00f1', // ñ
  UPPERCASE_A_ACCENT = '\u00c1', // Á
  UPPERCASE_E_ACCENT = '\u00c9', // É
  UPPERCASE_I_ACCENT = '\u00cd', // Í
  UPPERCASE_O_ACCENT = '\u00d3', // Ó
  UPPERCASE_U_ACCENT = '\u00da', // Ú
  UPPERCASE_N_TILDE = '\u00d1', // Ñ
}

// Mapa de caracteres especiales a sus equivalentes normalizados
const SPECIAL_CHAR_MAP: Record<string, string> = {
  [SpecialCharCodes.UNKNOWN_CHAR]: 'ó', // Reemplaza � con 'ó'
  [SpecialCharCodes.LOWERCASE_A_ACCENT]: 'á',
  [SpecialCharCodes.LOWERCASE_E_ACCENT]: 'é',
  [SpecialCharCodes.LOWERCASE_I_ACCENT]: 'í',
  [SpecialCharCodes.LOWERCASE_O_ACCENT]: 'ó',
  [SpecialCharCodes.LOWERCASE_U_ACCENT]: 'ú',
  [SpecialCharCodes.LOWERCASE_N_TILDE]: 'ñ',
  [SpecialCharCodes.UPPERCASE_A_ACCENT]: 'Á',
  [SpecialCharCodes.UPPERCASE_E_ACCENT]: 'É',
  [SpecialCharCodes.UPPERCASE_I_ACCENT]: 'Í',
  [SpecialCharCodes.UPPERCASE_O_ACCENT]: 'Ó',
  [SpecialCharCodes.UPPERCASE_U_ACCENT]: 'Ú',
  [SpecialCharCodes.UPPERCASE_N_TILDE]: 'Ñ',
};

// Función para normalizar caracteres especiales
function normalizeString(str: string): string {
  if (!str) return '';

  // Reemplazar caracteres codificados usando el mapa
  let normalizedStr = str;

  // Aplicar todos los reemplazos definidos en el mapa
  Object.entries(SPECIAL_CHAR_MAP).forEach(([code, replacement]) => {
    // Crear un RegExp dinámico para reemplazar todas las ocurrencias
    const regex = new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    normalizedStr = normalizedStr.replace(regex, replacement);
  });

  return normalizedStr;
}

// Mapa inverso para obtener las posibles variantes de cada encabezado
const HEADER_VARIANTS: Record<CsvRowHeaders, string[]> = {
  [CsvRowHeaders.pais]: ['Pais', 'País'],
  [CsvRowHeaders.uuid]: ['Número de documento', 'Numero de documento'],
  [CsvRowHeaders.documentType]: ['Tipo de documento'],
  [CsvRowHeaders.estadoDeValidaciones]: ['Estado de validaciones'],
  [CsvRowHeaders.proveedor]: ['Proveedor'],
  [CsvRowHeaders.proveedorId]: ['Proveedor ID'],
  [CsvRowHeaders.fechaDeRecepcion]: ['Fecha de recepción', 'Fecha de recepcion'],
  [CsvRowHeaders.asignacionSapSku]: ['Asignación de SAP SKU', 'Asignacion de SAP SKU'],
  [CsvRowHeaders.estadoIntegracionSap]: [
    'Estado IntegraciónSAP',
    'Estado Integración SAP',
    'Estado Integracion SAP',
  ],
  [CsvRowHeaders.estadoDeConciliacion]: ['Estado de conciliación', 'Estado de conciliacion'],
  [CsvRowHeaders.estadoDeLasSolicitudes]: ['Estado de las solicitudes'],
  [CsvRowHeaders.ordenDeCompra]: ['Orden de compra'],
  [CsvRowHeaders.fechaDeEmision]: ['Fecha de emisión', 'Fecha de emision'],
  [CsvRowHeaders.numeroDeEnvio]: ['Número de envío', 'Numero de envio'],
  [CsvRowHeaders.estadoDeEnvio]: ['Estado de envío', 'Estado de envio'],
  [CsvRowHeaders.monto]: ['Monto'],
  [CsvRowHeaders.estadoSap]: ['Estado SAP'],
  [CsvRowHeaders.estadoEnJira]: ['Estado en Jira'],
  [CsvRowHeaders.subEstadoEnJira]: ['Sub - Estado en Jira'],
};

// Construir el mapa de encabezados dinámicamente
const HEADER_MAP: Record<string, CsvRowHeaders> = {};

// Llenar el mapa de encabezados a partir de las variantes
Object.entries(HEADER_VARIANTS).forEach(([enumValue, variants]) => {
  const csvHeader = enumValue as CsvRowHeaders;
  variants.forEach((variant) => {
    HEADER_MAP[variant] = csvHeader;
    // También agregar la versión normalizada
    HEADER_MAP[normalizeString(variant)] = csvHeader;
  });
});

// Función para mapear los nombres de las columnas
function mapHeaderName(header: string): CsvRowHeaders | null {
  if (!header) return null;

  // Normalizar el encabezado para comparación
  const normalizedHeader = normalizeString(header);

  // Buscar el encabezado exacto en el mapa
  if (HEADER_MAP[header]) {
    return HEADER_MAP[header];
  }

  // Buscar la versión normalizada
  if (HEADER_MAP[normalizedHeader]) {
    return HEADER_MAP[normalizedHeader];
  }

  // Si no se encuentra, intentar buscar por coincidencia parcial
  for (const [key, value] of Object.entries(HEADER_MAP)) {
    if (normalizedHeader.includes(key) || key.includes(normalizedHeader)) {
      return value;
    }
  }

  console.warn(`No se pudo mapear el encabezado: ${header}`);
  return null;
}

function parsingRows(items: any): CsvRow[] {
  try {
    console.log('Entrada recibida en parsingRows:', JSON.stringify(items));

    // Verificar si tenemos la estructura esperada (Items como array)
    if (!items || !Array.isArray(items)) {
      console.error('No se encontró un array de Items válido en la entrada', items);
      const noItemsError = {
        errorType: 'Lambda.NoItemsToProcess',
        errorMessage: 'No hay filas para procesar',
      };
      throw noItemsError;
    }

    // Procesar cada elemento del array Items
    let rows = items.map((item: any) => {
      // Verificar que el item sea un objeto
      if (typeof item !== 'object' || item === null) {
        console.error('Item no es un objeto válido:', item);
        return {} as CsvRow;
      }

      // Crear un objeto CsvRow con los valores mapeados
      const row: Partial<Record<CsvRowHeaders, string>> = {};

      // Iterar sobre cada propiedad del objeto y mapearla al encabezado correspondiente
      for (const [key, value] of Object.entries(item)) {
        // Normalizar el valor si es una cadena
        const normalizedValue = typeof value === 'string' ? normalizeString(value) : String(value);

        // Intentar mapear el nombre de la columna al enumerado CsvRowHeaders
        const headerEnum = mapHeaderName(key);

        if (headerEnum) {
          row[headerEnum] = normalizedValue.trim();
        } else {
          // Si no se puede mapear, intentar encontrar una coincidencia aproximada
          console.warn(`No se pudo mapear la columna: ${key}`);
        }
      }

      // Asegurarse de que todos los campos requeridos estén presentes
      // No podemos usar Object.values con const enum, así que enumeramos los campos manualmente
      const requiredHeaders = [
        CsvRowHeaders.pais,
        CsvRowHeaders.uuid,
        CsvRowHeaders.documentType,
        CsvRowHeaders.estadoDeValidaciones,
        CsvRowHeaders.proveedor,
        CsvRowHeaders.proveedorId,
        CsvRowHeaders.fechaDeRecepcion,
        CsvRowHeaders.asignacionSapSku,
        CsvRowHeaders.estadoIntegracionSap,
        CsvRowHeaders.estadoDeConciliacion,
        CsvRowHeaders.estadoDeLasSolicitudes,
        CsvRowHeaders.ordenDeCompra,
        CsvRowHeaders.fechaDeEmision,
        CsvRowHeaders.numeroDeEnvio,
        CsvRowHeaders.estadoDeEnvio,
        CsvRowHeaders.monto,
        CsvRowHeaders.estadoSap,
        CsvRowHeaders.estadoEnJira,
        CsvRowHeaders.subEstadoEnJira,
      ];

      requiredHeaders.forEach((header) => {
        if (!row[header]) {
          row[header] = '';
        }
      });

      return row as CsvRow;
    });

    console.log('Filas procesadas:', rows);

    if (!rows || !Array.isArray(rows)) {
      console.error(
        'Invalid request body: Items array is required',
        `Items: ${rows}, Items type: ${typeof rows}`,
      );
      throw new Error('Invalid request body: Items array is required');
    }

    // Filtrar filas vacías o con 'No aplica' en subEstadoEnJira
    rows = rows.filter((row: Record<CsvRowHeaders, string>) => {
      // Verificar si la fila es un objeto vacío
      if (!row || Object.keys(row).length === 0) {
        return false;
      }

      // Verificar si el campo requerido existe y no es 'No aplica'
      const subEstado = row[CsvRowHeaders.subEstadoEnJira];
      return subEstado !== 'No aplica';
    });

    if (!rows.length) {
      console.error('Todas las filas tienen subEstadoEnJira como No aplica o están vacías');
      return [];
    }

    console.log(`Se procesaron ${rows.length} filas válidas`);
    return rows;
  } catch (error) {
    console.error('Error al procesar las filas:', error);
    throw error;
  }
}

// Función principal que organiza el flujo
export default async function post(request: Request): Promise<Response> {
  try {
    // Log request details
    console.log('=== REQUEST DETAILS ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Method:', request.method);

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {status: 405});
    }

    // Parse request body
    const payload = await request.json();
    console.log('Request body:', JSON.stringify(payload));

    const {BatchInput: context, Items: items} = payload.event;

    if (!context) {
      console.error('BatchInput is required in the event');
      return new Response('BatchInput is required in the event', {status: 400});
    }

    const {executionId, projectId, apiBaseUrl, forgeToken} = context;

    // Validaciones básicas
    if (!forgeToken || forgeToken === '') {
      console.error('forgeToken is required');
      return new Response('forgeToken is required', {status: 400});
    }

    // Procesar rows con la nueva estructura
    const rows = parsingRows(items);

    return new Response(
      JSON.stringify({Items: rows, BatchInput: {executionId, projectId, apiBaseUrl, forgeToken}}),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error al procesar las filas:', error);
    throw error;
  }
}
