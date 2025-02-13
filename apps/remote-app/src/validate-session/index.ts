import {Handler} from 'aws-lambda';

import {validateContextToken} from '@utils/functions';

export const handler: Handler = async (event, _context) => {
  // Aquí implementa la lógica real para validar la sesión.
  // Por ejemplo, podrías verificar un token o consultar un servicio externo.

  //Acá deberíamos obtener el AppId
  const {
    payload: {oauthSystemToken, appId, invocationToken, operationId},
  } = event;
  const validation = await validateContextToken(invocationToken, appId);

  if (validation) {
    //const sqs = Queue('scarlet-execution-queue)
    // sqs.push()
  }
  const response = {
    systemToken: 'abc123',
    sessionValid: true, // Debe ser false si la sesión no es válida.
    operationId,
    oauthSystemToken,
    appId,
  };
  return response;
};
