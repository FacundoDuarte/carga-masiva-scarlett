import Resolver from "@forge/resolver";
import { Queue } from "@forge/events";
import { TicketFields } from "../utils/types";
import { getExistingIssues } from "../utils/functions";
const resolver = new Resolver();

resolver.define("createJiraIssuesFromCsv", async (req) => {
    const { csvData } = req.payload;

    const queue = new Queue({ key: "queue-name" });

    const scarlettIds = csvData.map(row => row["ID Scarlett"]);
    const formattedQuery = `"ID Scarlett[Labels]" in (${scarlettIds.map(id => `"${id}"`).join(", ")})`;
    const existingIssues = await getExistingIssues(formattedQuery);
    
    for (const field of csvData) {
            let ticket: Partial<TicketFields> = {};
            ticket.summary = field["Summary"] ?? "";
            ticket.description = field["Description"] ?? "";
            ticket.scarlettId = field["ID Scarlett"] ?? "";
            ticket.pais = field["Pais"] ?? "";
            ticket.method = existingIssues.some(issue => issue.fields.customfield_10378 == field["ID Scarlett"]) ? "PUT" : "POST";
            ticket.key = ticket.method == "PUT" ? existingIssues.filter(issue => issue.fields.customfield_10378 == field["ID Scarlett"])[0].key : "";
            await queue.push(ticket);
    }

    return { message: "Se enviaron los tickets para la creacion" };
});

export const handler = resolver.getDefinitions();
