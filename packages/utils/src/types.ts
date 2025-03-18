export const enum JobStatus {
  todo = 'todo',
  inProgress = 'inProgress',
  success = 'success',
  failed = 'failed',
  omit = 'omit',
}
export const enum Appearance {
  default = 'default',
  inProgress = 'inProgress',
  moved = 'moved',
  removed = 'removed',
  success = 'success',
}

export interface Job {
  id: string;
  ticket?: Partial<Issue> | undefined;
  status: JobStatus;
}

export type ItemCounts = {
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
  timedOut: number;
  aborted: number;
  total: number;
  finished: number; // Custom field for finished items (succeeded + failed + timedOut + aborted)
};
export type invokeCsvOperations = {
  status: number;
  body: {
    success: boolean;
    fileId: string;
  };
};
export type Issue = {
  key: string | undefined;
  id: number | undefined;
  fields: {
    project: {id: number};
    summary: string | undefined;
    issuetype: {id: number};
    status?: {
      name: string;
      // id: string;
    };
  } & CustomField;
};

type CustomField = {
  [key: `customfield_${number}`]:
    | string
    | number
    | (string | any)[]
    | {value: string | undefined}
    | {id: number | undefined}
    | undefined
    | [];
};

export type OperationPayload = EditionChangePayload | TransitionPayload;

export type EditionChangePayload = {
  issue: Partial<Issue>;
  method: 'PUT' | 'POST';
  change: {
    type: 'create' | 'update';
    transitionId?: number;
  };
  credentials?: {
    authToken: string;
    apiBaseUrl: string;
  };
};
export type TransitionPayload = {
  issue: Partial<Issue>;
  method: 'PUT' | 'POST';
  change: {
    type: 'transition';
    transitionId: number;
  };
  credentials?: {
    authToken: string;
    apiBaseUrl: string;
  };
};
