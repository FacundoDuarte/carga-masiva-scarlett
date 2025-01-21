import Resolver, { ResolverFunction } from "@forge/resolver";
import api, { route } from "@forge/api";
import { requestTicketsJira, getExistingIssues } from "../utils/functions";
import { Invoice } from "@utils/types";
import { JobProgress, Queue } from "@forge/events";

const resolver = new Resolver();
const myQueue = new Queue({ key: "operations-queue" });

resolver.define("operations-queue-listener", async (event) => {
    const payload = event.payload as OperationPayload;
    await requestTicketsJira(payload);
});



export const consumerHandler: ReturnType<typeof resolver.getDefinitions> =
    resolver.getDefinitions();

type OperationPayload = {
    method: "PUT" | "POST";
    key: string | undefined;
} & Partial<Invoice>;
