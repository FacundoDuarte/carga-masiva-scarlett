import {SSM} from '/opt/utils/index.js';

// Interface to represent the counts of items in different states
import type {ItemCounts} from 'utils/src/types';

export default async function post(request: Request): Promise<Response> {
  try {
    // Manejo de CORS para preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // // Se espera que se invoque con el método POST
    // if (request.method !== 'POST') {
    //   return new Response('Method not allowed', {
    //     status: 405,
    //     headers: {'Content-Type': 'text/plain'},
    //   });
    // }

    // Se recibe el executionArn en el cuerpo de la petición
    const {executionArn} = await request.json();

    if (!executionArn) {
      return new Response('Missing required parameter: executionArn', {
        status: 400,
        headers: {'Content-Type': 'text/plain'},
      });
    }

    // Ejecutar DescribeExecution para obtener los detalles de la ejecución
    const stateMachineDescribe = await new SSM().getStateMachineStatus(executionArn);
    console.log(`Status: ${stateMachineDescribe}`);
    console.log(`Status JSON: ${JSON.stringify(stateMachineDescribe)}`);
    // Verificar que la ejecución haya finalizado (SUCCEEDED, FAILED o TIMED_OUT)

    // if (
    //   !stateMachineDescribe ||
    //   !['SUCCEEDED', 'FAILED', 'TIMED_OUT'].includes(stateMachineDescribe.status ?? 'ERROR')
    // ) {
    //   return new Response('La ejecución aún no ha finalizado', {
    //     status: 400,
    //     headers: {'Content-Type': 'text/plain'},
    //   });
    // }

    if (!stateMachineDescribe || !stateMachineDescribe.output) {
      // En lugar de devolver un error, devolvemos un objeto de conteos vacío
      const emptyResponse: ItemCounts = {
        pending: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
        timedOut: 0,
        aborted: 0,
        total: 0,
        finished: 0
      };
      
      return new Response(JSON.stringify({counts: emptyResponse}), {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      });
    }

    // Initialize output with the parsed output from stateMachineDescribe
    // and ensure mapRuns array exists
    const output = {
      ...JSON.parse(stateMachineDescribe.output),
      mapRuns: [], // Initialize mapRuns as an empty array
    };
    // Suponiendo que el output tiene un campo "mapRunArn"
    // const mapRunArn = output.mapRunArn;
    const stateMachineMapRuns = await new SSM().listStateMachineMapRuns(executionArn);
    console.log(`State Machine Map Runs: ${JSON.stringify(stateMachineMapRuns)}`);

    if (
      !stateMachineMapRuns ||
      !stateMachineMapRuns.mapRuns ||
      stateMachineMapRuns.mapRuns.length === 0
    ) {
      // En lugar de devolver un error, devolvemos un objeto de conteos vacío
      // para que el frontend pueda mostrar valores iniciales mientras se inicializa
      const emptyResponse: ItemCounts = {
        pending: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
        timedOut: 0,
        aborted: 0,
        total: 0,
        finished: 0
      };
      
      return new Response(JSON.stringify({counts: emptyResponse}), {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      });
    }
    // Initialize aggregated counts
    const aggregatedCounts: ItemCounts = {
      pending: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      timedOut: 0,
      aborted: 0,
      total: 0,
      finished: 0,
    };

    // Process each map run
    for (const mapRun of stateMachineMapRuns.mapRuns) {
      if (!mapRun.mapRunArn) {
        // Simplemente saltamos este mapRun y continuamos con el siguiente
        console.log('No se encontró mapRunArn para uno de los mapRuns, continuando con el siguiente');
        continue;
      }

      // Get detailed status for this map run
      const stateMapDescribe = await new SSM().getStateMachineMapRunStatus(mapRun.mapRunArn);
      console.log(`stateMapDescribe: ${JSON.stringify(stateMapDescribe)}`);

      // Calculate item counts if itemCounts exists and add to aggregated counts
      if (stateMapDescribe.itemCounts) {
        // Calculate counts for this map run
        const mapRunCounts: ItemCounts = {
          pending: stateMapDescribe.itemCounts.pending || 0,
          running: stateMapDescribe.itemCounts.running || 0,
          succeeded: stateMapDescribe.itemCounts.succeeded || 0,
          failed: stateMapDescribe.itemCounts.failed || 0,
          timedOut: stateMapDescribe.itemCounts.timedOut || 0,
          aborted: stateMapDescribe.itemCounts.aborted || 0,
          total: stateMapDescribe.itemCounts.total || 0,
          // Calculate finished items (sum of succeeded, failed, timedOut, and aborted)
          finished:
            (stateMapDescribe.itemCounts.succeeded || 0) +
            (stateMapDescribe.itemCounts.failed || 0) +
            (stateMapDescribe.itemCounts.timedOut || 0) +
            (stateMapDescribe.itemCounts.aborted || 0),
        };

        // Add to aggregated counts
        aggregatedCounts.pending += mapRunCounts.pending;
        aggregatedCounts.running += mapRunCounts.running;
        aggregatedCounts.succeeded += mapRunCounts.succeeded;
        aggregatedCounts.failed += mapRunCounts.failed;
        aggregatedCounts.timedOut += mapRunCounts.timedOut;
        aggregatedCounts.aborted += mapRunCounts.aborted;
        aggregatedCounts.total += mapRunCounts.total;
        aggregatedCounts.finished += mapRunCounts.finished;

        // Add the map run details to the output along with calculated counts
        output.mapRuns.push({
          ...stateMapDescribe,
          // Add the calculated counts as a separate property
          counts: mapRunCounts,
        });
      } else {
        // If no itemCounts, just add the map run details without counts
        output.mapRuns.push(stateMapDescribe);
      }
    }

    // Return only the aggregated counts
    return new Response(JSON.stringify({counts: aggregatedCounts}), {
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error) {
    console.error('Error en DescribeExecution:', error);
    return new Response(`Error processing request: ${error}`, {status: 500});
  }
}
