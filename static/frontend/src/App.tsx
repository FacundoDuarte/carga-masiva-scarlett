import React, { useState } from 'react';
import Form, { Field, ErrorMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import { Button } from "@forge/react";
import Papa from 'papaparse';
import { invoke } from '@forge/bridge';
import { css } from '@emotion/css';


export default function App() {
  const [csvFile, setCsvFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setCsvFile(file);
  };

  const handleSubmit = async () => {
    if (!csvFile) {
      alert('Primero selecciona un archivo CSV');
      return;
    }

    // Parsear CSV con Papa.parse
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        console.log('CSV parseado:', parsedData);

        try {
          // Invoca la función del backend que crea tickets
          const response = await invoke('createJiraIssuesFromCsv', { csvData: parsedData });
          console.log('Tickets creados:', response);
        } catch (err) {
          console.error('Error al crear tickets:', err);
        }
      },
      error: (err) => {
        console.error('Error al parsear CSV:', err);
      },
    });
  };

  return (
    <div
      className={css`
        margin: 16px auto;
        max-width: 400px;
      `}
    >
      <h1>Subir CSV</h1>

      <Form onSubmit={handleSubmit}>
        {({ formProps, submitting }) => (
          <form {...formProps}>
            <Field
              name="csv-file"
              label="Selecciona tu archivo CSV"
              isRequired
            >
              {({ fieldProps, error }) => (
                <>
                  <Textfield
                    {...fieldProps}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  {error && (
                    <ErrorMessage>
                      {error}
                    </ErrorMessage>
                  )}
                </>
              )}
            </Field>

            <div style={{ marginTop: 16 }}>
              <Button
                type="submit"
                appearance="primary"
                isDisabled={submitting}
              >
                Crear Tickets
              </Button>
            </div>
          </form>
        )}
      </Form>
    </div>
  );
}
