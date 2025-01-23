import React, {useState, useEffect} from 'react';
import Form, {Field, ErrorMessage} from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import Papa from 'papaparse';
import {invoke, view} from '@forge/bridge';
import {css} from '@emotion/css';
import {FullContext} from '@forge/bridge/out/types';
import {Invoice, Job, JobStatus} from './types';
import Lozenge, { ThemeAppearance } from '@atlaskit/lozenge';
// import {JobCard} from './components/JobCard';

export default function App() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState(null);
  const [context, setContext] = useState<FullContext | undefined>();
  const [csvDataCount, setCsvDataCount] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [shouldCheck, setShouldCheck] = useState(false);

  useEffect(() => {
    const initContext = async () => {
      try {
        const contextData = await view.getContext();
        setContext(contextData);
      } catch (error) {
        console.error('Error al obtener el contexto:', error);
      }
    };
    initContext();
  }, []);

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

  // Si no se encuentra el proyecto dentro de ExtensionData, se tira una excepción
  if (!context?.extension || !context.extension.project?.id) {
    return <></>;
  }
  const projectId = context.extension.project.id;
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCsvFile(file);
  };

  const handleSubmit = async () => {
    if (!csvFile) {
      alert('Primero selecciona un archivo CSV');
      return;
    }

    // Reset messages
    setSuccessMessage(null);
    setErrorMessage(null);

    // Parsear CSV con Papa.parse
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        setCsvDataCount(parsedData.length); // Set the count of CSV data
        try {
          const jobList = await initOperationFromCsv(parsedData, projectId);
          console.log('Job List:', jobList);
          setJobs(
            jobList.map((job) => ({
              status: JobStatus.inProgress,
              id: job.jobId,
              ticket: job.ticket,
            })),
          );
          setSuccessMessage('Operaciones iniciadas con éxito');
          setShouldCheck(true);
        } catch (err) {
          console.error('Error al crear tickets:', err);
          setErrorMessage(`Error al crear tickets: ${err}`);
        }
      },
      error: (err) => {
        console.error('Error al parsear CSV:', err);
        setErrorMessage(`Error al parsear CSV: ${err}`);
      },
    });
  };

  const checkJobStatusAutomatically = () => {
    console.log('se ejecutó el checkJobs');
    const newIntervalId = setInterval(async () => {
      try {
        const jobIds = jobs.map(job => job.id);
        
        if (jobIds.length === 0) {
          clearInterval(newIntervalId);
          setIntervalId(null);
          setShouldCheck(false);
          return;
        }

        const updatedJobs: Job[] = await getJobsStatus(jobIds);
        console.log('Updated Jobs:', updatedJobs);

        setJobs(prevJobs => 
          prevJobs.map(job => {
            const updatedJob = updatedJobs.find(updated => updated.id === job.id);
            return updatedJob ? {
              ...job,
              status: updatedJob.status
            } : job;
          })
        );
        
        if (updatedJobs.every(job => job.status === JobStatus.success)) {
          clearInterval(newIntervalId);
          setIntervalId(null);
          setShouldCheck(false);
        }
      } catch (err) {
        console.error('Error al verificar estado de los jobs:', err);
        clearInterval(newIntervalId);
        setIntervalId(null);
        setShouldCheck(false);
      }
    }, 2000);

    setIntervalId(newIntervalId);
  };

  const allJobsSuccessful = jobs.every((job) => job.status === JobStatus.success);

  return (
    <div
      className={css`
        margin: 16px auto;
        max-width: 400px;
        text-align: center;
      `}>
      <h1
        className={css`
          color: #0052cc;
        `}>
        Subir CSV
      </h1>

      {csvDataCount !== null && (
        <p
          className={css`
            color: #36b37e;
          `}>
          Número de elementos en el CSV: {csvDataCount}
        </p>
      )}

      {successMessage && (
        <p
          className={css`
            color: #36b37e;
          `}>
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p
          className={css`
            color: #ff5630;
          `}>
          {errorMessage}
        </p>
      )}

      <Form onSubmit={handleSubmit}>
        {({formProps, submitting}) => (
          <form {...formProps}>
            <Field name="csv-file" label="Selecciona tu archivo CSV" isRequired>
              {({fieldProps, error}) => (
                <>
                  <Textfield
                    {...fieldProps}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  {error && <ErrorMessage>{error}</ErrorMessage>}
                </>
              )}
            </Field>

              <Button
                type='submit'
                appearance="primary"
                isDisabled={submitting || !allJobsSuccessful}>
                Crear Ticket
              </Button>
              
          </form>
        )}
      </Form>

      {jobs && jobs.length > 0 && (
        <div>
          <table className="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">Summary</th>
                <th className="border border-gray-300 px-4 py-2">Description</th>
                <th className="border border-gray-300 px-4 py-2">Method</th>
                <th className="border border-gray-300 px-4 py-2">Estado</th>
                <th className="border border-gray-300 px-4 py-2">Issue Key</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
 
  );
}

async function initOperationFromCsv(
  parsedData,
  projectId: string | number,
): Promise<{ticket: Partial<Invoice>; jobId: string}[]> {
  const result = (await invoke('issue-operations-from-csv', {
    csvData: parsedData,
    projectId: projectId,
  })) as {ticket: Partial<Invoice>; jobId: string}[];
  console.log('Result from initOperationFromCsv:', result);
  return result;
}

async function getJobsStatus(jobIds: string[]): Promise<Job[]> {
  console.log('Jobs to check status:', jobIds);
  const result = await invoke('get-jobs-status', {jobsList: jobIds}) as Job[];
  console.log('Result from invoke:', result);
  return result;
}

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({job}) => {
  function getAppearanceAndText(status: JobStatus): {appearance: ThemeAppearance , text: string} {
    switch (status) {
      case JobStatus.success:
        return { appearance: 'success', text: 'Finalizado' };
      case JobStatus.failed:
        return { appearance: 'removed', text: 'Error' };
      case JobStatus.todo:
        return { appearance: 'default', text: 'Pendiente' };
      default:
        return { appearance: 'inprogress', text: 'En proceso' };
    }
  }

  const { appearance, text } = getAppearanceAndText(job.status);

  return (
    <tr className="bg-white border-b border-gray-200">
      <td className="border border-gray-300 px-4 py-2">{job.ticket?.summary || 'N/A'}</td>
      <td className="border border-gray-300 px-4 py-2">{job.ticket?.description || 'N/A'}</td>
      <td className="border border-gray-300 px-4 py-2">{job.ticket?.method || 'N/A'}</td>
      <td className="border border-gray-300 px-4 py-2">
        <Lozenge appearance={appearance}>{text}</Lozenge>
      </td>
      <td className="border border-gray-300 px-4 py-2">{job.ticket?.key || 'N/A'}</td>
    </tr>
  );
};
