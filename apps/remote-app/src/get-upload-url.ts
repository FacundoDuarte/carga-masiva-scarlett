import {v4 as uuidv4} from 'uuid';
import {S3Client} from 'bun';
import Busboy from '@fastify/busboy';
import * as XLSX from 'xlsx';

interface APIGatewayEvent {
  body: string | null;
  isBase64Encoded?: boolean;
}

export default async function post(request: Request): Promise<Response> {
  try {
    // Log request details
    console.log('=== REQUEST DETAILS ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Method:', request.method);

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {status: 405});
    }

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return new Response('Content-Type must be multipart/form-data', {status: 400});
    }

    // Función auxiliar para convertir XLSX a CSV
    const convertXlsxToCsv = (buffer: Buffer): Buffer => {
      // Opciones de lectura optimizadas
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: false,
        cellNF: false,
        cellText: false,
      });

      const sheetName = 'Listado de Facturas_Master File';

      if (!workbook.Sheets[sheetName]) {
        throw new Error(`La hoja '${sheetName}' no existe en el archivo Excel`);
      }

      // Opciones de conversión optimizadas
      const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], {
        blankrows: false,
        skipHidden: true,
        rawNumbers: true,
      });

      return Buffer.from(csvContent);
    };

    let bodyBuffer: Uint8Array;
    try {
      bodyBuffer = await new Promise((resolve, reject) => {
        let fileData: Buffer | null = null;
        let fileName: string | null = null;
        let fileEnded = false;

        const busboyHeaders = {
          'content-type': contentType || '',
        };

        const busboy = new Busboy({
          headers: busboyHeaders,
          preservePath: true,
        });

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
          if (fieldname !== 'file') {
            file.resume(); // Skip this file
            return;
          }

          console.log('File upload started:', {
            fieldname,
            filename,
            encoding,
            mimetype,
          });

          fileName = filename;
          const chunks: Buffer[] = [];

          file.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          file.on('end', () => {
            fileEnded = true;
            if (chunks.length > 0) {
              fileData = Buffer.concat(chunks);

              try {
                if (!filename) {
                  throw new Error('No filename provided');
                }

                let finalFileName = filename;

                // Si es un archivo Excel, convertirlo a CSV
                if (
                  mimetype ===
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  filename.toLowerCase().endsWith('.xlsx')
                ) {
                  console.log('Converting XLSX to CSV...');
                  fileData = convertXlsxToCsv(fileData);
                  finalFileName = filename.replace(/\.xlsx$/i, '.csv');
                  console.log('XLSX converted to CSV successfully');
                }

                console.log('File received:', {
                  originalName: filename,
                  finalName: finalFileName,
                  size: fileData.length,
                  originalType: mimetype,
                  finalType: 'text/csv',
                });

                fileName = finalFileName; // Actualizar el fileName para uso posterior
                resolve(new Uint8Array(fileData));
              } catch (error) {
                console.error('Error processing file:', error);
                reject(error);
              }
            } else {
              reject(new Error('Empty file received'));
            }
          });
        });

        busboy.on('finish', () => {
          if (!fileEnded) {
            reject(new Error('No file field found in form data'));
          }
        });

        // Manejar el stream directamente
        if (request.body) {
          const reader = request.body.getReader();
          const pump = async () => {
            try {
              while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                busboy.write(value);
              }
              busboy.end();
            } catch (err) {
              reject(err);
            }
          };
          pump();
        } else {
          reject(new Error('No request body found'));
        }
      });
    } catch (error) {
      console.error('Error processing form data:', error);
      return new Response('Error processing form data: ' + error, {status: 400});
    }

    console.log('Body buffer length:', bodyBuffer.length);

    if (bodyBuffer.length === 0) {
      console.log('No content detected');
      return new Response('No CSV content provided', {status: 400});
    }

    // Log the first few bytes for debugging
    console.log(
      'First bytes (hex):',
      Array.from(bodyBuffer.slice(0, 16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' '),
    );

    const client = new S3Client({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: 'scarlet-operations-dev-scarlet-storage',
    });

    const fileId = uuidv4();
    const key = `uploads/${fileId}.csv`;
    const s3File = client.file(key);

    // Count CSV rows (excluding header)
    const csvContent = new TextDecoder().decode(bodyBuffer);
    const rows = csvContent.trim().split('\n');
    const rowCount = Math.max(0, rows.length - 1); // Subtract 1 for header

    const writer = s3File.writer();
    writer.write(bodyBuffer);
    await writer.end();

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        key,
        rowCount,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Transfer-Encoding': 'binary',
        },
      },
    );
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return new Response('Failed to generate upload URL', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    });
  }
}
