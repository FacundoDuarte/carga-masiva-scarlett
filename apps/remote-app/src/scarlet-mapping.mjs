import { scarlettMapping } from '/opt/utils/custom_fields';
export default function post(event) {
    const partialInvoice = event;
    const issue = {
        key: partialInvoice.key,
        fields: {
            project: { id: partialInvoice.project?.id ?? 0 },
            summary: partialInvoice.summary,
            issuetype: { id: 11871 },
        }
    };
    for (const [cfField, mapFunction] of Object.entries(scarlettMapping)) {
        issue.fields[cfField] = mapFunction(partialInvoice);
    }
    return new Response(JSON.stringify(issue));
}
;
