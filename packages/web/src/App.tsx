import React, { useState, useEffect, useRef } from 'react';
import { view, invokeRemote } from '@forge/bridge';
import { FullContext } from '@forge/bridge/out/types';
import type { ItemCounts } from 'utils/src/types';

// Importamos el componente Dashboard y el enum Status
import Dashboard, { Status } from './component/Dashboard';

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
  const [execution, setExecution] = useState<string | null>(null);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);

  // Estado para almacenar el resumen de tickets
  const [ticketsState, setTicketState] = useState<ItemCounts>({
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    timedOut: 0,
    aborted: 0,
    total: 0,
    finished: 0,
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
        const templateUrl = await _downloadTemplate();
        setTemplateUrl(templateUrl);
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

  const ticketsResult = async (executionId: string) => {
    try {
      // Esperar 3 segundos antes de la primera consulta para dar tiempo a que la máquina de estados se inicialice
      console.log('Esperando 3 segundos antes de la primera consulta...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get initial status
      const status = await _getStatusStateMachine(executionId);
      console.log('Initial state machine status:', status);

      // Update ticket states with the received counts
      setTicketState({
        succeeded: status.succeeded || 0,
        failed: status.failed || 0,
        pending: status.pending || 0,
        total: status.total || 0,
        running: status.running || 0,
        timedOut: status.timedOut || 0,
        aborted: status.aborted || 0,
        finished: status.finished || 0,
      });

      // Set up polling every 5 seconds
      if (ticketsPollingIntervalRef.current) {
        clearInterval(ticketsPollingIntervalRef.current);
      }

      ticketsPollingIntervalRef.current = setInterval(async () => {
        try {
          // Check if we're still processing
          if (isProcessing !== Status.inprogress) {
            if (ticketsPollingIntervalRef.current) {
              clearInterval(ticketsPollingIntervalRef.current);
              ticketsPollingIntervalRef.current = null;
            }
            return;
          }

          const updatedStatus = await _getStatusStateMachine(executionId);
          console.log('Updated state machine status:', updatedStatus);

          // Update ticket states with the latest counts
          setTicketState({
            succeeded: updatedStatus.succeeded || 0,
            failed: updatedStatus.failed || 0,
            pending: updatedStatus.pending || 0,
            total: updatedStatus.total || 0,
            running: updatedStatus.running || 0,
            timedOut: updatedStatus.timedOut || 0,
            aborted: updatedStatus.aborted || 0,
            finished: updatedStatus.finished || 0,
          });

          // Si hay elementos totales y todos están terminados, detener el polling
          // Pero solo si hay al menos un elemento total y ha pasado al menos 10 segundos desde el inicio
          const hasItems = updatedStatus.total > 0;
          const allFinished = updatedStatus.finished === updatedStatus.total;
          const hasProcessedItems = updatedStatus.finished > 0;
          
          if (hasItems && allFinished && hasProcessedItems) {
            setIsProcessing(Status.done);
            if (ticketsPollingIntervalRef.current) {
              clearInterval(ticketsPollingIntervalRef.current);
              ticketsPollingIntervalRef.current = null;
            }
            setMessage({
              message: 'Procesamiento completado',
              appereance: 'success',
            });
          }
        } catch (error) {
          console.error('Error polling state machine status:', error);
          if (ticketsPollingIntervalRef.current) {
            clearInterval(ticketsPollingIntervalRef.current);
            ticketsPollingIntervalRef.current = null;
          }
        }
      }, 5000); // Poll every 5 seconds

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
      const { executionId } = await _invokeCsvOperations(
        objectKey,
        context.extension.project.id
      );
      console.log('file id: ', executionId);

      setExecution(executionId);

      ticketsResult(executionId);
      setMessage({
        message: 'Operaciones iniciadas con éxito',
        appereance: 'information',
      });
      // Ya no establecemos el estado como 'done' aquí
      // El estado se establecerá como 'done' cuando el polling detecte que todo está terminado
    } catch (err) {
      console.error('Error al iniciar operaciones:', err);
      setMessage({
        message: `Error al iniciar operaciones: ${err}`,
        appereance: 'error',
      });
      // Solo establecemos el estado como 'done' en caso de error
      setIsProcessing(Status.done);
    }
  };

  async function _downloadTemplate(): Promise<string> {
    const payload = await invokeRemote({
      path: '/Prod/download-template',
      method: 'GET',
      headers: {
        Accept: '*/*',
        redirect: 'follow',
      },
    });
    console.log('payload: ', payload);
    return payload['body']['url'];
  }

  return (
    <Dashboard
      message={message}
      handleSubmit={handleSubmit}
      handleFileChange={handleFileChange}
      templateUrl={templateUrl}
      isProcessing={isProcessing}
      executionId={execution}
      ticketsState={ticketsState}
    />
  );
}

async function _invokeCsvOperations(
  s3Key: string,
  projectId: string
): Promise<{ executionId: string }> {
  const res = await invokeRemote<{ executionId: string }>({
    path: '/Prod/validate-session',
    method: 'POST',
    body: {
      projectId: projectId,
      fileId: s3Key,
    },
  });
  console.log('res: ', res);
  const executionId = res['body']['executionId'];
  return { executionId };
}

async function _getStatusStateMachine(
  executionId: string
): Promise<ItemCounts> {
  const res = await invokeRemote<{ counts: ItemCounts }>({
    path: '/Prod/executions',
    method: 'POST',
    body: {
      executionArn: executionId,
    },
  });
  console.log('res: ', res);

  return res['body']['counts'];
}
