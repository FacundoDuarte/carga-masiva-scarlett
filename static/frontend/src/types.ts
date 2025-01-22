export const enum JobStatus {
  todo = 'todo',
  inProgress = 'inProgress',
  success = 'success',
  failed = 'failed',
}

export interface Job {
  id: string;
  ticket: Partial<Invoice> | undefined;
  status: JobStatus;
}

export type Invoice = {
  summary: string;
  projectId: number;
  description: string;
  scarlettId: string;
  country: string;
  method: string;
  key?: string;
};
