import Resolver from '@forge/resolver';
import {Queue} from '@forge/events';
import {Invoice, Issue} from '../utils/types';
import {getExistingIssues} from '../utils/functions';

const resolver = new Resolver();

resolver.define('issue-operations-from-csv', async (req) => {
  const {csvData, projectId} = req.payload;

  const queue = new Queue({key: 'operations-queue'});

  const invoiceIdList: string[] = csvData.map((row: {'ID Scarlett': string}) => row['ID Scarlett']);
  const formattedQuery = `"ID Scarlett[Labels]" in (${invoiceIdList
    .map((id) => `"${id}"`)
    .join(', ')})`;
  const existingIssues = await getExistingIssues(formattedQuery);

  for (const csvRow of csvData) {
    let ticket: Partial<Invoice> = {
      summary: csvRow['Summary'] ?? '',
      projectId: projectId,
      description: csvRow['Description'] ?? '',
      scarlettId: csvRow['ID Scarlett'] ?? '',
      country: csvRow['Pais'] ?? '',

      method: existingIssues.some(
        (issue) => issue.fields.customfield_10378 == csvRow['ID Scarlett'],
      )
        ? 'PUT'
        : 'POST',
    };
    if (ticket.method == 'PUT') {
      //agregamos la key en caso de ser una edición
      let iss: Issue = existingIssues.filter(
        (issue) => issue.fields.customfield_10378 == csvRow['ID Scarlett'],
      )[0];
      ticket.key = iss.key;

    }
    await queue.push(ticket);
  }

  return {message: 'Se enviaron los tickets para la creacion'};
});

export const handler: ReturnType<typeof resolver.getDefinitions> = resolver.getDefinitions();
