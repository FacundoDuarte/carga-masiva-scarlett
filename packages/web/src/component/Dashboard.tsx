import React from 'react';
import Form, { Field, ErrorMessage } from '@atlaskit/form';
import TextField from '@atlaskit/textfield';
import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button/new';
import SectionMessage, { Appearance } from '@atlaskit/section-message';
import { DynamicTableStateless } from '@atlaskit/dynamic-table';
import { router } from '@forge/bridge';
import type { ItemCounts } from 'utils/src/types';
import RechartsPieChart from './PieChart'; // Importa el componente de la gráfica

export enum Status {
  init,
  loaded,
  inprogress,
  done,
}

export default function Dashboard({
  message,
  handleSubmit,
  handleFileChange,
  templateUrl,
  isProcessing,
  executionId,
  ticketsState,
}: {
  message: { message: string; appereance: string } | null;
  handleSubmit: () => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  templateUrl: string | null;
  isProcessing: Status;
  executionId: string | null;
  ticketsState: ItemCounts;
}) {
  return (
    <div style={{ margin: '16px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#fff' }}>Sube el archivo .CSV</h1>

      {message && (
        <div style={{ marginBottom: '1rem' }}>
          <SectionMessage appearance={`${message.appereance as Appearance}`}>
            {message.message}
          </SectionMessage>
        </div>
      )}

      <Form onSubmit={handleSubmit}>
        {({ formProps }) => (
          <form {...formProps} style={{ marginBottom: '2rem' }}>
            <div style={{ width: 600 }}>
              <Field
                name="csv-file"
                label="Selecciona tu archivo CSV"
                isRequired
              >
                {({ fieldProps, error }) => (
                  <>
                    <TextField
                      {...fieldProps}
                      type="file"
                      onChange={handleFileChange}
                    />
                    {error && <ErrorMessage>{error}</ErrorMessage>}
                  </>
                )}
              </Field>
            </div>
            <div style={{ marginTop: 'var(--ds-space-200)' }}>
              {(isProcessing === Status.init ||
                isProcessing === Status.loaded) && (
                <ButtonGroup>
                  <Button
                    isDisabled={templateUrl === null}
                    onClick={() => router.navigate(templateUrl)}
                  >
                    Descargar Template
                  </Button>
                  <Button
                    type="submit"
                    appearance="primary"
                    isDisabled={isProcessing !== Status.loaded}
                  >
                    Ejecutar cambios
                  </Button>
                </ButtonGroup>
              )}
            </div>
          </form>
        )}
      </Form>

      {isProcessing !== Status.init && (
      <div>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#fff' }}>Distribución de Estados</h3>
            <div
              style={{
                height: 1000,
                width: '100%',
                maxWidth: 1000,
                margin: '0 auto',
              }}
            >
              <RechartsPieChart data={ticketsState} />
            </div>
          </div>

          {isProcessing === Status.done && (
            <div style={{ marginTop: '10px', color: '#fff' }}>
              Procesamiento completado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
