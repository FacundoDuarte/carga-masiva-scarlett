import React, { useState, useEffect, useRef } from 'react';
import Form, { Field, ErrorMessage } from '@atlaskit/form';
import TextField from '@atlaskit/textfield';
import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button/new';
import { view, invokeRemote } from '@forge/bridge';
// import {  } from '@forge/api';
import { FullContext } from '@forge/bridge/out/types';
import SectionMessage, { Appearance } from '@atlaskit/section-message';
import { DynamicTableStateless } from '@atlaskit/dynamic-table';
import { TicketStates } from 'utils/src/types';
import { json } from 'stream/consumers';

const enum Status {
  init,
  loaded,
  inprogress,
  done,
}

export default function App() {
  // Estado para el archivo CSV y el contexto
  const [objectKey, setObjectKey] = useState<string | undefined>();
  const [context, setContext] = useState<FullContext | undefined>();

  // Estados para mensajes y proceso
  const [message, setMessage] = useState<{
    message: string;
    appereance: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<Status>(Status.init);

  // Estado para el operationId que se obtiene al invocar la operación con el CSV
  const [executionId, setExecutionId] = useState<string | null>(null);

  // Estado para almacenar el resumen de tickets
  const [ticketsState, setTicketState] = useState<TicketStates>({
    succeeded: 0,
    omited: 0,
    failed: 0,
    total: 0,
  });

  // Ref para el intervalo del polling del resumen
  const ticketsPollingIntervalRef = useRef<NodeJS.Timer | null>(null);

  // Inicializamos el contexto de Forge al montar el componente
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

    // Limpiar el intervalo al desmontar
    return () => {
      if (ticketsPollingIntervalRef.current) {
        clearInterval(ticketsPollingIntervalRef.current);
      }
    };
  }, []);

  const ticketsResult = async (executionArn: string) => {
      try {
        const test = await _getStatusStateMachine(executionArn);
        console.log("test: " + test);
        
        setMessage({
          message: 'Verificando acciones...',
          appereance: 'information',
        });
        } catch (err) {
        console.error('Error al consultar resumen de tickets:', err);
      }
  };

  // Manejador para subir el archivo CSV
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    try {
      setIsProcessing(Status.inprogress);
      if (!file) {
        setMessage({
          message: 'No se ha seleccionado ningun archivo',
          appereance: 'error',
        });
        return;
      }
      // Primero obtenemos la URL pre-firmada
      const response = await invokeRemote<{
        body: {
          success: boolean;
          fileId: string;
          url: string;
        };
      }>({
        method: 'POST',
        path: '/Prod/get-upload-url',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: 'text/csv',
        }),
      });
      console.log('Full response:', JSON.stringify(response, null, 2));

      if (!response.body) {
        throw new Error('Response body is undefined');
      }

      const { fileId, url } = response.body;

      if (!url) {
        throw new Error('Pre-signed URL is undefined');
      }

      console.log('Got pre-signed URL:', url);
      console.log('FileId:', fileId);

      // Ahora subimos el archivo directamente a S3
      try {
        console.log('Attempting to upload file to:', url);
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/csv',
          },
          body: file, // Enviamos el archivo directamente
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
          );
        }

        console.log('File uploaded successfully');
        setObjectKey(fileId);
        setMessage(null);
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        setMessage({
          message: `Error al subir el archivo: ${uploadError.message}`,
          appereance: 'error',
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({ message: err as string, appereance: 'error' });
    } finally {
      setIsProcessing(Status.loaded);
    }
  };

  // Manejador para enviar el CSV
  const handleSubmit = async () => {
    if (!objectKey) {
      alert('Primero selecciona un archivo CSV');
      return;
    }
    setMessage(null);

    try {
      setIsProcessing(Status.inprogress);
      const fileId = await _invokeCsvOperations(
        objectKey,
        context.extension.project.id
      );
      console.log("file id: " ,fileId);
      
      setExecutionId(fileId);
      ticketsResult(fileId);
      setMessage({
        message: 'Operaciones iniciadas con éxito',
        appereance: 'information',
      });
    } catch (err) {
      console.error('Error al iniciar operaciones:', err);
      setMessage({
        message: `Error al iniciar operaciones: ${err}`,
        appereance: 'error',
      });
    } finally {
      setIsProcessing(Status.done);
    }
  };

  async function _downloadTemplate() {
    const payload = await invokeRemote({
      path: '/Prod/download-template',
      method: 'GET',
    });
    return payload;
  }

  return (
    <div style={{ margin: '16px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#fff' }}>Sube el archivo CSV</h1>

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
                  <Button onClick={_downloadTemplate}>
                    Descargar template
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
        <DynamicTableStateless
          isLoading={isProcessing === Status.inprogress}
          head={{
            cells: [
              { key: 'creado', content: 'Creado' },
              { key: 'editado', content: 'Editado' },
              { key: 'omitido', content: 'Omitido' },
              { key: 'error', content: 'Error' },
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
                  key: 'omitido',
                  content: ticketsState.omited,
                },
                {
                  key: 'error',
                  content: ticketsState.failed,
                },
                {
                  key: 'total',
                  content: ticketsState.total,
                },
              ],
            },
          ]}
        />
      )}
    </div>
  );
}

async function _invokeCsvOperations(
  s3Key: string,
  projectId: string
): Promise<string> {
  const res = await invokeRemote<{ executionId: string }>({
    path: '/Prod/validate-session',
    method: 'POST',
    body: {
      projectId: projectId,
      fileId: s3Key,
    },
  });
  console.log("execution test: ", res.executionId);
  console.log("res: ", res);
  console.log("Execution IDDD: ", res["body"]["executionId"]);
  const response = res.executionId;
  const executionId = res["body"]["executionId"]
  return executionId;
}

async function _getStatusStateMachine(
  executionArn: string
): Promise<TicketStates> {
  const res = await invokeRemote<{stateMachineStatus: TicketStates}>({
    path: '/Prod/executions',
    method: "POST",
    body: {
      executionArn: executionArn
    }
  })
  console.log(res);
  
  return res.stateMachineStatus;
}