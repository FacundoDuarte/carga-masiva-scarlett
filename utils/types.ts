export type TicketFields = {
    summary: string,
    description: string,
    scarlettId: string,
    pais: string,
    method: string,
    key?: string
}

type CustomField = {
    [key: `customfield_${number}`]: string | (string | undefined)[] | { value: (string | undefined) } | undefined | [];
};
type Description = {
    type: "doc";
    version: 1;
    content: [
        {
            type: "paragraph";
            content: [
                {
                    type: "text";
                    text: string | undefined;
                }
            ];
        }
    ];
}

export type JiraRequestBody = {
    fields: {
        summary: string | undefined;
        description: Description | string;
    } & CustomField;
};
