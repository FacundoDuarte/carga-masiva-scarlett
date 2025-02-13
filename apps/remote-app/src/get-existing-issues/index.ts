import {CF, CsvRow, CsvRowHeaders} from '@utils/custom_fields';
import {getExistingIssues} from '@utils/functions';
import {Handler} from 'aws-lambda';

type GetExistingIssuesPayload = {
  Items: CsvRowHeaders[];
};

export const handler: Handler = async (event, _context) => {
  // Aquí implementa la lógica real para validar la sesión.
  // Por ejemplo, podrías verificar un token o consultar un servicio externo.
  console.log(event);
  const {
    payload: {Items: parsedData},
  } = event;

  const scarlettIds: string[] = parsedData.map((row) => row[CsvRowHeaders.uuid]);

  console.log(`cantidad de scarlett Ids: ${scarlettIds.length}, `, scarlettIds);

  const existingIssues = await getExistingIssues(
    `"Scarlett ID[Labels]" in (${scarlettIds.join(', ')})`,
    [CF.scarlett_id, CF.summary],
  );
  console.log(`existingIssues: ${JSON.stringify(existingIssues)}`);

  // Remover las filas que tienen '0' en la columna 'uuid'
  const filteredData = parsedData.filter((row: CsvRow) => row[CsvRowHeaders.uuid] !== '0');

  const response = {
    systemToken: 'abc123',
    sessionValid: true, // Debe ser false si la sesión no es válida.
  };
  return response;
};
