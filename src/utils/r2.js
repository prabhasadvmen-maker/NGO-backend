import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let r2Client = null;

const getR2Client = () => {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return r2Client;
};

/**
 * Upload a file directly to R2 (backend handles upload)
 * @param {string} key - Object key (path in bucket)
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} contentType - MIME type of the file
 */
export async function uploadToR2(key, fileBuffer, contentType) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });
  await client.send(command);
}

/**
 * Generate a presigned URL for uploading a file to R2
 * @param {string} key - Object key (path in bucket)
 * @param {string} contentType - MIME type of the file
 * @param {number} expiresIn - Seconds until URL expires (default 5 minutes)
 */
export async function getUploadPresignedUrl(key, contentType, expiresIn = 300) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for viewing/downloading a file from R2
 * @param {string} key - Object key stored in DB
 * @param {number} expiresIn - Seconds until URL expires (default 1 hour)
 */
export async function getViewPresignedUrl(key, expiresIn = 3600) {
  if (!key) return null;
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete an object from R2
 * @param {string} key - Object key to delete
 */
export async function deleteObject(key) {
  if (!key) return;
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET;
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await client.send(command);
}
