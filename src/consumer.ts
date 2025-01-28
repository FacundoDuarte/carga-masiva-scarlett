import Resolver from "@forge/resolver";
import { requestTicketsJira } from "../utils/functions";
import { Invoice } from "@utils/types";
import {storage} from "@forge/api"

const resolver = new Resolver();

resolver.define("operations-queue-listener", async ({payload, context}) => {
    const ticket = await requestTicketsJira(payload as OperationPayload);
   if(payload.method != "PUT"){
    console.log(`[Storage] Guardando ticket key ${ticket?.key} para job ${context.jobId}`);
    await storage.set(`scarlett-${context.jobId}`, ticket?.key);
    console.log(`[Storage] Ticket key guardado exitosamente para job ${context.jobId}`);
   }
});


export const consumerHandler: ReturnType<typeof resolver.getDefinitions> =
    resolver.getDefinitions();

type OperationPayload = {
    method: "PUT" | "POST";
    key: string | undefined;
} & Partial<Invoice>;
