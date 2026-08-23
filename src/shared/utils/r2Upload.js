import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

/**
 * Upload file to Cloudflare R2
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name/path in R2
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - R2 key/path
 */
export const uploadToR2 = async (fileBuffer, fileName, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await getS3Client().send(command);
    return fileName;
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

/**
 * Get public URL for R2 file
 * @param {string} key - R2 file key
 * @returns {string} - Public URL
 */
export const getR2PublicUrl = (key) => {
  if (!key) return null;
  return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;
};
