import {AtlassianDocument} from './types/atlassian-document';

export type Invoice = {
  summary: string;
  projectId: number;
  description: string;
  scarlettId: string;
  country: string;
  method: string;
  key?: string;
};

export type QueryPayload = {
  issues: Issue[];
};

export type Issue = {
  key: string | undefined;
  fields: {
    project: {id: number};
    summary: string | undefined;
    issuetype: {id: number};
    description: AtlassianDocument;
  } & CustomField;
};

type CustomField = {
  [key: `customfield_${number}`]:
    | string
    | (string | any)[]
    | {value: string | undefined}
    | {id: number | undefined}
    | undefined
    | AtlassianDocument
    | [];
};
