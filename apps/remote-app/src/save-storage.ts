import {Handler} from 'aws-lambda';

export const handler: Handler = async (event, _context) => {
  // Aquí implementa la lógica real para validar la sesión.
  // Por ejemplo, podrías verificar un token o consultar un servicio externo.

  
  const response = {
    systemToken: 'abc123',
    sessionValid: true, // Debe ser false si la sesión no es válida.
  };
  return response;
};
