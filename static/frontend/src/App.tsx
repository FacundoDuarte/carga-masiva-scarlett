import React, {useState, useEffect} from 'react';
import Form, {Field, ErrorMessage} from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import {Button, Spinner} from '@forge/react';
import Papa from 'papaparse';
import {invoke, view} from '@forge/bridge';
import {css} from '@emotion/css';
import {FullContext} from '@forge/bridge/out/types';

export default function App() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState(null);
  const [context, setContext] = useState<FullContext | undefined>();
  const [csvDataCount, setCsvDataCount] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Si no se encuentra el proyecto dentro de ExtensionData, se tira una excepción
  if (!context?.extension || !context.extension.project?.id) {
    return <Spinner />;
  }
  const projectId = context.extension.project.id;
  console.log(`projectId: ${projectId}`);
  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
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
        console.log('CSV parseado:', parsedData);
        try {
          // Invoca la función del backend que crea tickets
          const response = await invoke('issue-operations-from-csv', {
            csvData: parsedData,
            projectId: projectId,
          });
          console.log('Tickets creados:', response);
          setSuccessMessage('Tickets creados/editados con éxito');
        } catch (err) {
          console.error('Error al crear tickets:', err);
          setErrorMessage('Error al crear tickets');
        }
      },
      error: (err) => {
        console.error('Error al parsear CSV:', err);
        setErrorMessage('Error al parsear CSV');
      },
    });
  };

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

            <div
              className={css`
                margin-top: 16px;
              `}>
              <Button type="submit" appearance="primary" isDisabled={submitting}>
                Crear Tickets
              </Button>
            </div>
          </form>
        )}
      </Form>
    </div>
  );
}
