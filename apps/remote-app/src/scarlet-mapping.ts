import { scarlettMapping } from 'utils/custom_fields';
import { Invoice, Issue } from 'utils/types';

export default function post(event): Response {
  const partialInvoice: Partial<Invoice> = event;

  const issue: Issue = {
    key: partialInvoice.key,
    fields: {
      project: { id: partialInvoice.project?.id ?? 0 },
      summary: partialInvoice.summary,
      issuetype: { id: 11871 }, 
    }
  };

  for (const [cfField, mapFunction] of Object.entries(scarlettMapping)) {
    (issue.fields as any)[cfField] = mapFunction(partialInvoice);
  }

  return new Response(JSON.stringify(issue));
};
