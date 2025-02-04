import React, {useState, useEffect} from 'react';
import Form, {Field, ErrorMessage} from '@atlaskit/form';
import TextField from '@atlaskit/textfield';
import {ButtonGroup} from '@atlaskit/button';
import Button from '@atlaskit/button/new';
import Papa from 'papaparse';
import {invoke, view, router} from '@forge/bridge';
import {FullContext} from '@forge/bridge/out/types';
import {Appearance, Invoice, Issue, Job, JobStatus} from './types';
import {Anchor, Box, xcss} from '@atlaskit/primitives';
import Issue16Icon from '@atlaskit/icon-object/glyph/issue/16';

import { DynamicTableStateless } from '@atlaskit/dynamic-table';
import SectionMessage from '@atlaskit/section-message';
import Lozenge from '@atlaskit/lozenge';
import {ThemeAppearance} from '@atlaskit/lozenge/dist/types';

// ----------------------------------
// Mapear la key del status de Jira (statusCategory.key) a un color del Lozenge
function mapJiraStatusToAppearance(statusKey: string): string {
  const statusMap: Record<string, Appearance> = {
    new: Appearance.default,
    indeterminate: Appearance.inProgress,
    done: Appearance.success,
  };
  // En caso de no coincidir con los que definiste, usamos "default"
  return statusMap[statusKey] || Appearance.default;
}

// ----------------------------------
// Determinar color + texto para el estado de la cola
function getAppearanceAndText(status: JobStatus): {
  appearance: string;
  text: string;
} {
  switch (status) {
    case JobStatus.success:
      return {appearance: Appearance.success, text: 'Finalizado'};
    case JobStatus.failed:
      return {appearance: Appearance.removed, text: 'Error'};
    case JobStatus.todo:
      return {appearance: Appearance.default, text: 'Pendiente'};
    default:
      return {appearance: Appearance.inProgress, text: 'En proceso'};
  }
}

// ----------------------------------
// El componente que mostrará un enlace al Issue y el Lozenge con estado real de Jira
function IssueCard({
  issueKey,
  summary,
  statusKey,
  statusName,
}: {
  issueKey: string;
  summary: string;
  statusKey: string;
  statusName: string;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.open(`/browse/${issueKey}`);
  };

  // Mapeo de key a color del Lozenge
  const jiraAppearance = mapJiraStatusToAppearance(statusKey);
  // Estilos con Atlaskit Primitives + Emotion
  const anchorStyles = xcss({
    color: 'color.link',
    backgroundColor: 'elevation.surface',
    textDecoration: 'none',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border',
    borderRadius: '3px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'space.100',
    paddingInline: 'space.050',
    paddingBlock: 'space.025',
    ':hover': {
      backgroundColor: 'elevation.surface.hovered',
      textDecoration: 'none',
    },
    ':active': {
      color: 'color.link.pressed',
      backgroundColor: 'elevation.surface.pressed',
    },
    ':visited': {
      color: 'color.link.visited',
    },
    ':visited:active': {
      color: 'color.link.visited.pressed',
    },
  });

  const iconContainerStyles = xcss({
    width: '16px',
    display: 'flex',
  });

  return (
    <Anchor href="#" interactionName="atlas-link" xcss={anchorStyles} onClick={handleClick}>
      <Box xcss={iconContainerStyles}>
        <Issue16Icon label="" />
      </Box>
      {issueKey}: {summary}
      <Lozenge appearance={jiraAppearance as ThemeAppearance}>{statusName}</Lozenge>
      {/* <Lozenge appearance='default'>{statusName}</Lozenge> */}
    </Anchor>
  );
}
const enum Status {
  init,
  inprogress,
  done
}
export default function App() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [context, setContext] = useState<FullContext | undefined>();
  const [csvDataCount, setCsvDataCount] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Control de verificación periódica
  const [shouldCheck, setShouldCheck] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer | null>(null);
    const [isProcessing, setIsProcessing] = useState<Status>(Status.init);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // ----------------------
  // Efecto: Obtener contexto Forge
  // ----------------------
  useEffect(() => {
    const initContext = async () => {
      await view.theme.enable();
      try {
        const contextData = await view.getContext();
        setContext(contextData);
      } catch (error) {
        console.error('Error al obtener el contexto:', error);
      }
    };
    initContext();
  }, []);

  // ----------------------
  // Efecto: si "shouldCheck" se activa, inicia la verificación
  // ----------------------
  useEffect(() => {
    if (shouldCheck) {
      if (intervalId) {
        clearInterval(intervalId);
      }
      checkJobStatusAutomatically();
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [shouldCheck]);

  // ----------------------
  // Efecto: cuando cambien "jobs", intentar obtener issueKey para los POST "success"
  // ----------------------
  useEffect(() => {
    const updateJobsWithIssueKeys = async () => {
      let needsUpdate = false;
      const updated = await Promise.all(
        jobs.map(async (job) => {
          if (
            job.status === JobStatus.success &&
            !job.ticket?.key && // no tiene key
            job.ticket?.method === 'POST'
          ) {
            try {
              console.log(`[Storage] Buscando issueKey para job ${job.id}`);
              const issueKey = await _getIssueKeyFromJob(job.id);
              if (issueKey) {
                needsUpdate = true;
                return {
                  ...job,
                  ticket: {...job.ticket, key: issueKey},
                };
              }
            } catch (err) {
              console.error(`[Storage] Error al obtener issueKey:`, err);
            } 
          }
          return job;
        }),
      );
      if (needsUpdate) {
        setJobs(updated);
      }
    };
    updateJobsWithIssueKeys();
  }, [jobs]);

  // ----------------------
  // Revisamos si existe projectId
  // ----------------------
  if (!context?.extension || !context.extension.project?.id) {
    return null;
  }
  const projectId = context.extension.project.id;

  // ----------------------
  // Manejador de archivos CSV
  // ----------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCsvFile(file);

    // Limpiar estado anterior
    setJobs([]);
    setSuccessMessage('');
    setErrorMessage('');
  };

  // ----------------------
  // Enviar CSV
  // ----------------------
  const handleSubmit = async () => {
    if (!csvFile) {
      alert('Primero selecciona un archivo CSV');
      return;
    }
    setIsProcessing(Status.inprogress);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Obtener la URL pre-firmada para subir el archivo
      const uploadUrl = (await invoke('get-upload-url', {fileName: csvFile.name})) as string;

      // Subir el archivo a S3 usando la URL pre-firmada
      await fetch(uploadUrl, {
        method: 'PUT',
        body: csvFile,
        headers: {'Access-Control-Allow-Origin': '*'},
      });

      // Llamar al backend para procesar el archivo desde S3
      const jobList = await _executeCsvOperations(csvFile.name, projectId);

      // Generar estado local
      setJobs(
        jobList.map((j) => ({
          status: JobStatus.inProgress,
          id: j.jobId,
          ticket: j.ticket,
        })),
      );
      setSuccessMessage('Operaciones iniciadas con éxito');
      setShouldCheck(true);
    } catch (err) {
      console.error('Error al crear tickets:', err);
      setErrorMessage(`Error al crear tickets: ${err}`);
    } finally {
      setIsProcessing(Status.done)
    }
  };

  // ----------------------
  // checkJobStatus: actualiza jobs de la "página visible"
  // ----------------------
  const checkJobStatusAutomatically = () => {
    const newIntervalId = setInterval(async () => {
      try {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const endIndex = startIndex + ROWS_PER_PAGE;
        const pendingJobs = jobs
          .slice(startIndex, endIndex)
          .filter((j) => j.status !== JobStatus.success && j.status !== JobStatus.failed);

        // Si no queda ninguno en proceso, detiene el polling
        if (pendingJobs.length === 0) {
          clearInterval(newIntervalId);
          setIntervalId(null);
          setShouldCheck(false);
          return;
        }

        // 2) Mapeamos solo esos pendingJobs a jobIds
        const jobIds = pendingJobs.map((job) => job.id);

        // Llamamos al backend para ver su estado en la cola
        const updatedJobList: Job[] = await getJobsStatus(jobIds);

        // Sacamos las issueKeys de esos 'pendingJobs' que tengan ticket.key
        const issueKeys = pendingJobs.map((job) => job.ticket.key).filter(Boolean) as string[];

        // Llamamos a get-issue-status
        const issuesFromJira = await _getIssueStatus(issueKeys);

        // Combinar ambos
        setJobs((prev) =>
          prev.map((job) => {
            // Si no está en los 'pendingJobs', no lo toques
            if (!jobIds.includes(job.id)) {
              return job;
            }

            // a) estado de la cola
            const updatedCola = updatedJobList.find((u) => u.id === job.id);

            // b) estado real en Jira
            let updatedJiraStatus;
            if (job.ticket?.key) {
              const match = issuesFromJira.find((iss) => iss.key === job.ticket.key);
              updatedJiraStatus = match?.fields.status; // ...
            }

                        return {
                            ...job,
                            status: updatedCola
                                ? updatedCola.status
                                : job.status,
                            ticket: {
                                ...job.ticket,
                                status: updatedJiraStatus,
                            },
                        };
                    })
                );
            } catch (err) {
                console.error("Error al verificar estado de los jobs:", err);
                clearInterval(newIntervalId);
                setIntervalId(null);
                setShouldCheck(false);
            }
        }, 4000);
        setIntervalId(newIntervalId);
    };

  // ----------------------
  // Definición de columnas de DynamicTable
  // (5 columnas -> "Resumen", "Scarlett ID", "Acción", "Estado sync (cola)", "Issue Key")
  // ----------------------
  const tableHead = {
    cells: [
      {key: 'summary', content: 'Resumen'},
      {key: 'scarlett_id', content: 'Scarlett ID'},
      {key: 'method', content: 'Accion'},
      {key: 'queueStatus', content: 'Estado sync (cola)'},
      {key: 'issueKey', content: 'Issue Key'},
    ],
  };

  // Generamos las filas a partir de "jobs"
  // --> Pasamos TODOS los jobs para que DynamicTable genere la paginación
  const rows = jobs.map((job) => {
    const {appearance, text} = getAppearanceAndText(job.status);
    console.log('job: ' + JSON.stringify(job));
    return {
      key: job.id,
      cells: [
        {
          key: 'summary',
          content: job.ticket?.summary || '...',
        },
        {
          key: 'scarlett_id',
          content: job.ticket?.scarlettId || '...',
        },
        {
          key: 'method',
          content: job.ticket?.method === 'POST' ? 'Creacion' : 'Edicion',
        },
        {
          key: 'queueStatus',
          content: <Lozenge appearance={appearance as ThemeAppearance}>{text}</Lozenge>,
        },
        {
          key: 'issueKey',
          content: job.ticket?.key ? (
            <IssueCard
              issueKey={job.ticket.key}
              summary={job.ticket.summary || ''}
              statusKey={job.ticket.status?.statusCategory.key || 'new'}
              statusName={job.ticket.status?.name || '...'}
            />
          ) : (
            '...'
          ),
        },
      ],
    };
  });

  async function _downloadTemplate(e) {
    const url: string = await invoke('download-template', {});
    console.log(`url: ${url}`);
    e.preventDefault();
    router.open(url);
  }

  // ----------------------
  // Render principal
  // ----------------------
  return (
    <div style={{margin: '16px auto', fontFamily: 'sans-serif'}}>
      <h1 style={{color: '#fff'}}>Sube el archivo</h1>

      {!successMessage && !errorMessage && csvDataCount !== null && (
        <SectionMessage appearance="information">
          Número de elementos en el archivo: {csvDataCount}
        </SectionMessage>
      )}

      {successMessage && (
        <div style={{marginBottom: '1rem'}}>
          <SectionMessage appearance="success">{successMessage}</SectionMessage>
        </div>
      )}

      {errorMessage && (
        <div style={{marginBottom: '1rem'}}>
          <SectionMessage appearance="error">{errorMessage}</SectionMessage>
        </div>
      )}

      <Form onSubmit={handleSubmit}>
        {({formProps}) => (
          <form {...formProps} style={{marginBottom: '2rem'}}>
            <div style={{width: 600}}>
              <Field name="csv-file" label="Selecciona tu archivo CSV" isRequired>
                {({fieldProps, error}) => (
                  <>
                  <TextField {...fieldProps} type="file" onChange={handleFileChange} />
                    {error && <ErrorMessage>{error}</ErrorMessage>}
                  </>
                )}
              </Field>
            </div>
            <div style={{marginTop: 'var(--ds-space-200)'}}>
              { isProcessing == Status.init &&(
                <ButtonGroup>
                <Button onClick={_downloadTemplate}>Descargar template</Button>
                <Button type="submit" appearance="primary">Ejecutar cambios</Button>
                </ButtonGroup>
               )}
            </div>
          </form>
        )}
      </Form>
      
      {isProcessing != Status.init && (
        <DynamicTableStateless
          head={tableHead}
          rows={rows}
          rowsPerPage={ROWS_PER_PAGE}
          page={currentPage}
          isLoading={isProcessing == Status.inprogress}
          onSetPage={(newPage) => {
            setCurrentPage(newPage);
            setShouldCheck(true);
            setIsProcessing(Status.inprogress);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------
// Funciones auxiliares
// -------------------------------------------------------------------------------------
async function initOperationFromCsv(
  parsedData: unknown[],
  projectId: string | number,
): Promise<{ticket: Partial<Invoice>; jobId: string}[]> {
  return (await invoke('issue-operations-from-csv', {
    csvData: parsedData,
    projectId,
  })) as {ticket: Partial<Invoice>; jobId: string}[];
}

async function getJobsStatus(jobIds: string[]): Promise<Job[]> {
  return (await invoke('get-jobs-status', {jobsList: jobIds})) as Job[];
}

async function _getIssueStatus(issueKeys: string[]): Promise<Issue[]> {
  return (await invoke('get-issue-status', {issueKeys})) as Issue[];
}

async function _getIssueKeyFromJob(jobId: string): Promise<string> {
  return (await invoke('get-issue-key', {id: jobId})) as string;
}
async function _executeCsvOperations(
  name,
  projectId,
): Promise<{ticket: Partial<Invoice>; jobId: string}[]> {
  return await invoke('issue-operations-from-csv', {
    s3Key: `uploads/${Date.now()}-${name}`,
    projectId,
  });
}

type IssueOperationsRequest = {
  payload: {
    s3Key: string;
    projectId: string;
  };
  context: {
    jobId: string;
  };
};
