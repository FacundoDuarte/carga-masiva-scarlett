// import Resolver from '@forge/resolver';
// import {requestTicketsJira} from '@utils/functions';
// import {Invoice, IssueOperationsFromCsvPayload, OperationPayload} from '@utils/types';
// import {storage} from '@forge/api';

// const resolver = new Resolver();
// // : {payload: IssueOperationsFromCsvPayload; context: any}
// resolver.define(
//   'operations-queue-listener',
//   async ({payload, context}: {payload: OperationPayload; context: any}) => {
//     console.log(`Llegó el ticket a la cola: ${JSON.stringify(payload)}`);

//     const ticket = await requestTicketsJira(payload);
//     if (payload.method != 'PUT') {
//       console.log(`[Storage] Guardando ticket key ${ticket?.key} para job ${context.jobId}`);
//       await storage.set(`scarlett-${context.jobId}`, ticket?.key);
//       console.log(`[Storage] Ticket key guardado exitosamente para job ${context.jobId}`);
//     }
//   },
// );

// export const consumerHandler: ReturnType<typeof resolver.getDefinitions> =
//   resolver.getDefinitions();
