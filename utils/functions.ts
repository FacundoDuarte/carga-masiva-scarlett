import api, { Route, route } from "@forge/api";
import { TicketFields, JiraRequestBody } from "./types";

const validateIssueKey = (method: string, issueKey?: string) => {
    if (method.toLowerCase() === 'PUT' && !issueKey) {
        throw new Error('issueKey es requerido para editar un ticket');
    }
    return issueKey;
};

export const requestTicketsJira = async (
    payload: Partial<TicketFields>,
    method: "POST" | "PUT",
    issueKey?: string
) => {

    const jiraRoute =
        method === "PUT"
            ? route`/rest/api/3/issue/${validateIssueKey(method, issueKey)!}`
            : route`/rest/api/3/issue`;

    const jsonBody: JiraRequestBody = {
        fields: {
            summary: payload.summary,
            customfield_10378: [payload.scarlettId],
            customfield_10165: { value: payload.pais },
            customfield_10374: payload.description,
            description: {
                type: "doc",
                version: 1,
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: payload.description,
                            },
                        ],
                    },
                ],
            },
        },
    };
    const response = await api.asApp().requestJira(jiraRoute, {
        method,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonBody),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `Error al ${method === "POST" ? "crear" : "editar"} issue: ` +
                `${response.status} - ${JSON.stringify(errorData)}`
        );
    } else {
        if (response.status !== 204) {
            const data = await response.json();
            console.log(`Respuesta al ${method}:`, data);
            return data;
        } else {
            console.log(`Operación ${method} exitosa sin contenido (204)`);
            return {};
        }
    }
};

export const getExistingIssues = async (query: string) => {
    const fields = "summary,description,customfield_10378";
    const response = await api
        .asApp()
        .requestJira(
            route`/rest/api/3/search/jql?jql=${query}&fields=${fields}`,
            {
                method: "GET",
            }
        );
    const data = await response.json();
    return data.issues;
};
