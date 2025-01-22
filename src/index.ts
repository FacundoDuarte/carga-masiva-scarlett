import Resolver from '@forge/resolver';
import {Queue} from '@forge/events';
import {Invoice, Issue, Job, JobStatus} from '../utils/types';
import {getExistingIssues} from '../utils/functions';

const resolver = new Resolver();
const queue = new Queue({key: 'operations-queue'});

resolver.define('issue-operations-from-csv', async (req) => {
  const jobProgress = queue.getJob(req.context.jobId);
  try {
    const {csvData, projectId} = req.payload;
    const invoiceIdList: string[] = csvData.map(
      (row: {'ID Scarlett': string}) => row['ID Scarlett'],
    );
    const formattedQuery = `"ID Scarlett[Labels]" in (${invoiceIdList
      .map((id) => `"${id}"`)
      .join(', ')})`;
    const existingIssues = await getExistingIssues(formattedQuery);
    const ticketList: {ticket: Partial<Invoice>; jobId: string}[] = [];

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
        // Agregamos la key en caso de ser una edición
        let iss: Issue = existingIssues.filter(
          (issue) => issue.fields.customfield_10378 == csvRow['ID Scarlett'],
        )[0];
        ticket.key = iss.key;
      }
      const jobId = await queue.push(ticket);
      ticketList.push({ticket: ticket, jobId});
    }
    return ticketList;
  } catch (error) {
    await jobProgress.cancel();
  }
});

interface JobStatusRequest {
  payload: {
    jobsList: string[];
  };
  context: any;
}

resolver.define('get-jobs-status', async ({payload, context}: JobStatusRequest) => {
  const {jobsList} = payload;
  console.log(JSON.stringify(jobsList));
  const updatedJobs: Job[] = [];
  
  for (const jobId of jobsList) {
    const jobStatus = await _getJobStatus(jobId);
    updatedJobs.push({
      id: jobId,
      status: jobStatus
    });
  }
  return updatedJobs;
});

export const handler: ReturnType<typeof resolver.getDefinitions> = resolver.getDefinitions();
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

  throw new Error('Estado del trabajo no reconocido');
}
