import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { requestTicketsJira, getExistingIssues } from "../utils/functions";

const resolver = new Resolver();

resolver.define("event-listener", async ({ payload }) => {
    console.log(payload);
    
    const method = payload.method;
    const issueKey = payload.key
    await requestTicketsJira(payload, method, issueKey);
});

export const consumerHandler = resolver.getDefinitions();
