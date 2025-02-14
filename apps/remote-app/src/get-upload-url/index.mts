import type {Handler, APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {v4 as uuidv4} from 'uuid';

export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event: APIGatewayProxyEvent,
) => {
  // Log the event argument for debugging
  console.log(JSON.stringify(event, undefined, 2));

  const s3Client = new S3Client({
    region: 'us-east-1',
  });

  const fileId = uuidv4();
  const key = `uploads/${fileId}`;

  try {
    const command = new PutObjectCommand({
      Bucket: 'scarlet-operations-dev-storage',
      Key: key,
      ACL: 'public-read',
      ContentType: 'image/jpeg',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Origin,Accept,Referer',
      },
      body: JSON.stringify({
        uploadUrl,
        key,
      }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        // 'Access-Control-Allow-Origin': event.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With,DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Origin,Accept,Referer',
      },
      body: JSON.stringify({
        message: 'Failed to generate upload URL',
      }),
    };
  }
};
