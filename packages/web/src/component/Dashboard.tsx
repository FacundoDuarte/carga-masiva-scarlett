import React from 'react';
import Form, { Field, ErrorMessage } from '@atlaskit/form';
import TextField from '@atlaskit/textfield';
import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button/new';
import SectionMessage, { Appearance } from '@atlaskit/section-message';
import { DynamicTableStateless } from '@atlaskit/dynamic-table';
import { router } from '@forge/bridge';
import { ItemCounts } from 'utils/src/types';

// Función para navegar al template
const navigateToTemplate = (url: string | null) => () => {
  if (!url) {
    return;
  }
  router.navigate(url);
};

// Exportamos el enum para usarlo en App.tsx
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
                    onClick={navigateToTemplate(templateUrl)}
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

      {isProcessing !== Status.init && executionId && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>
            Estado del procesamiento {isProcessing === Status.inprogress && '(actualizando cada 5 segundos)'}
          </h3>
          <DynamicTableStateless
            isLoading={isProcessing === Status.inprogress}
            head={{
              cells: [
                { key: 'creado', content: 'Exitosos' },
                { key: 'pendiente', content: 'Pendientes' },
                { key: 'error', content: 'Errores' },
                { key: 'total', content: 'Total' },
                { key: 'progreso', content: 'Progreso' },
              ],
            }}
            rows={[
              {
                key: 'summary',
                cells: [
                  {
                    key: 'creado',
                    content: ticketsState.succeeded,
                  },
                  {
                    key: 'pendiente',
                    content: ticketsState.pending || 0,
                  },
                  {
                    key: 'error',
                    content: ticketsState.failed,
                  },
                  {
                    key: 'total',
                    content: ticketsState.total,
                  },
                  {
                    key: 'progreso',
                    content: ticketsState.total > 0 
                      ? `${Math.round((ticketsState.succeeded + ticketsState.failed) / ticketsState.total * 100)}%` 
                      : '0%',
                  },
                ],
              },
            ]}
          />
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
