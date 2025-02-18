import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export const handler = async (event) => {
    // Log the event argument for debugging
    console.log(JSON.stringify(event, undefined, 2));
    const s3Client = new S3Client({
        region: 'us-east-1',
    });
    try {
        const command = new GetObjectCommand({
            Bucket: 'scarlet-operations-dev-storage',
            Key: 'scarlet-template.xlsx',
        });
        const downloadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600, // URL válida por 1 hora
        });
        return {
            downloadUrl,
        };
    }
    catch (error) {
        console.error('Error generating download URL:', error);
        throw new Error('Failed to generate download URL');
    }
};
