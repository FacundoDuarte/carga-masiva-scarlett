import Resolver, {ResolverFunction} from '@forge/resolver';
import api, {route} from '@forge/api';
import {requestTicketsJira, getExistingIssues} from '../utils/functions';
import {Invoice} from '@utils/types';

const resolver = new Resolver();

resolver.define('operations-queue-listener', async (event) => {
  const payload = event.payload as OperationPayload;
  console.log(payload);
  await requestTicketsJira(payload);
});

export const consumerHandler: ReturnType<typeof resolver.getDefinitions> =
  resolver.getDefinitions();

type OperationPayload = {
  method: 'PUT' | 'POST';
  key: string | undefined;
} & Partial<Invoice>;