import Resolver from "@forge/resolver";
import { Queue } from "@forge/events";
import { Invoice, Issue, Job, JobStatus } from "../utils/types";
import { getExistingIssues } from "../utils/functions";
import { CF, row } from "../utils/custom_fields";
import { storage } from "@forge/api";

const resolver = new Resolver();
const queue = new Queue({ key: "operations-queue" });

resolver.define("issue-operations-from-csv", async (req) => {
    const jobProgress = queue.getJob(req.context.jobId);
    try {
        const { csvData, projectId } = req.payload;
        const invoiceIdList: string[] = csvData.map(
            (row: { "ID Scarlett": string }) => row["scarlett id"]
        );

        const formattedQuery = `"scarlett id[labels]" in (${invoiceIdList
            .map((id) => `"${id}"`)
            .join(", ")})`;
        const existingIssues = await getExistingIssues(
            formattedQuery,
            "customfield_19899"
        );

        const ticketList: { ticket: Partial<Invoice>; jobId: string }[] = [];

        for (const csvRow of csvData) {
            let ticket: Partial<Invoice> = {
                summary: csvRow[row.summary] ?? "",
                projectId: projectId,
                uuid: csvRow[row.uuid] ?? "",
                pais: csvRow[row.pais] ?? "",
                tipo_documento: csvRow[row.tipo_documento] ?? "",
                estado_validaciones: csvRow[row.estado_validaciones] ?? "",
                proveedor: csvRow[row.proveedor] ?? "",
                proveedor_id: csvRow[row.proveedor_id] ?? "",
                fecha_recepcion: csvRow[row.fecha_recepcion] ?? "",
                asignacion_sap_sku: csvRow[row.asignacion_sap_sku] ?? "",
                estado_integracion_sap:
                    csvRow[row.estado_integracion_sap] ?? "",
                estado_conciliacion: csvRow[row.estado_conciliacion] ?? "",
                estado_solicitudes: csvRow[row.estado_solicitudes] ?? "",
                orden_de_compra: csvRow[row.orden_de_compra] ?? "",
                fecha_emision: csvRow[row.fecha_emision] ?? "",
                is: csvRow[row.is] ?? "",
                estado_de_envio: csvRow[row.estado_de_envio] ?? "",
                monto: csvRow[row.monto] ?? "",
                estado_integracion_sap_final:
                    csvRow[row.estado_integracion_sap_final] ?? "",
                scarlettId: csvRow[row.scarlett_id] ?? "",
                method: existingIssues.some(
                    (issue) =>
                        issue.fields.customfield_19899 == csvRow["scarlett id"]
                )
                    ? "PUT"
                    : "POST",
            };
            if (ticket.method == "PUT") {
                // Agregamos la key en caso de ser una edición
                let iss: Issue = existingIssues.filter(
                    (issue) =>
                        issue.fields.customfield_19899 == csvRow["scarlett id"]
                )[0];
                ticket.key = iss.key;
            }
            const jobId = await queue.push(ticket);
            ticketList.push({ ticket: ticket, jobId });
        }
        return ticketList;
    } catch (error) {
        console.log("error: " + error);

        await jobProgress.cancel();
    }
});

interface JobStatusRequest {
    payload: {
        jobsList: string[];
    };
    context: any;
}

resolver.define(
    "get-jobs-status",
    async ({ payload, context }: JobStatusRequest) => {
        const { jobsList } = payload;
        const updatedJobs: Job[] = [];

        for (const jobId of jobsList) {
            const jobStatus = await _getJobStatus(jobId);
            updatedJobs.push({
                id: jobId,
                status: jobStatus,
            });
        }
        return updatedJobs;
    }
);

resolver.define("get-issue-key", async ({ payload, context }) => {
    return await storage.get(`scarlett-${payload.id}`);
});

resolver.define("get-issue-status", async ({ payload, context }) => {
    const formattedQuery = `key in (${payload.issueKeys
        .map((id) => `"${id}"`)
        .join(", ")})`;

    // Obtenemos las incidencias desde Jira, pidiendo 'status' en fields
    const issues = await getExistingIssues(formattedQuery, "status");

    // ANTES devolvías solo appearance y name
    return issues.map((issue) => ({
        key: issue.key,
        fields: {
          status: issue.fields.status,
        },
    }));
});

export const handler: ReturnType<typeof resolver.getDefinitions> =
    resolver.getDefinitions();

async function _getJobStatus(jobId: string): Promise<JobStatus> {
    const request = await queue.getJob(jobId).getStats();
    const statusList = await request.json();

    if (statusList.inProgress === 1) {
        return JobStatus.inProgress;
    } else if (statusList.success === 1) {
        return JobStatus.success;
    } else if (statusList.failed === 1) {
        return JobStatus.failed;
    }

    throw new Error("Estado del trabajo no reconocido");
}
