import Resolver from "@forge/resolver";
import { Queue } from "@forge/events";
import { Invoice, Issue } from "../utils/types";
import { getExistingIssues } from "../utils/functions";

const resolver = new Resolver();
const queue = new Queue({ key: "operations-queue" });

resolver.define("issue-operations-from-csv", async (req) => {
    const { csvData, projectId } = req.payload;

    const totalTickets = csvData.length;
    const invoiceIdList: string[] = csvData.map(
        (row: { "ID Scarlett": string }) => row["ID Scarlett"]
    );
    const formattedQuery = `"ID Scarlett[Labels]" in (${invoiceIdList
        .map((id) => `"${id}"`)
        .join(", ")})`;
    const existingIssues = await getExistingIssues(formattedQuery);
    const jobIds: string[] = [];

    for (const csvRow of csvData) {
        let ticket: Partial<Invoice> = {
            summary: csvRow["Summary"] ?? "",
            projectId: projectId,
            description: csvRow["Description"] ?? "",
            scarlettId: csvRow["ID Scarlett"] ?? "",
            country: csvRow["Pais"] ?? "",
            method: existingIssues.some(
                (issue) =>
                    issue.fields.customfield_10378 == csvRow["ID Scarlett"]
            )
                ? "PUT"
                : "POST",
        };
        if (ticket.method == "PUT") {
            // Agregamos la key en caso de ser una edición
            let iss: Issue = existingIssues.filter(
                (issue) =>
                    issue.fields.customfield_10378 == csvRow["ID Scarlett"]
            )[0];
            ticket.key = iss.key;
        }
        const jobId = await queue.push(ticket);
        jobIds.push(jobId);
    }

    const response = await queue.getJob(jobIds[0]).getStats();
    const {success, inProgress, failed} = await response.json();
    return {
        success,
        inProgress,
        failed,
        jobIds
    };
});
resolver.define("get-jobs-status", async (event) => {
    const jobsList = event.payload.jobsList;
    console.log(JSON.stringify(event.payload.jobsList));
    
    for(const job in jobsList){
        const jobProgress = queue.getJob(job);
        console.log(await jobProgress.getStats());
    }
    //const response = await jobProgress.getStats();
    //const { success, inProgress, failed } = await response.json();
});
export const handler: ReturnType<typeof resolver.getDefinitions> =
    resolver.getDefinitions();
