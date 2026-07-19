import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
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

/**
 * Ensure CORS configuration is set on the R2 bucket
 */
export async function ensureR2Cors() {
  try {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET;
    if (!bucket) {
      console.warn('⚠️ R2_BUCKET is not defined in environment variables.');
      return;
    }
    console.log(`🔧 Configuring CORS policy for R2 bucket: ${bucket}...`);
    const command = new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    });
    await client.send(command);
    console.log('✅ R2 bucket CORS policy configured successfully');
  } catch (error) {
    if (error.name === 'AccessDenied' || error.message.includes('Access Denied') || error.message.includes('AccessDenied')) {
      console.log('ℹ️ R2 API key lacks permission to update CORS programmatically (Access Denied). This is typical for standard object-only tokens. Please configure CORS manually in the Cloudflare dashboard under Bucket > Settings > CORS.');
    } else {
      console.error('❌ Failed to configure R2 CORS policy:', error.message);
    }
  }
}
