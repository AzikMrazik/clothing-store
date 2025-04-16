import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const bucket = process.env.YOS_BUCKET;
const endpoint = process.env.YOS_ENDPOINT;
const accessKeyId = process.env.YOS_ACCESS_KEY_ID;
const secretAccessKey = process.env.YOS_SECRET_ACCESS_KEY;

const s3 = new S3({
  endpoint,
  accessKeyId,
  secretAccessKey,
  region: 'ru-central1',
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

export async function uploadToYOS(filePath: string, fileName?: string): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  const fileStream = fs.createReadStream(filePath);
  const key = fileName || `${uuidv4()}${path.extname(filePath)}`;
  await s3.upload({
    Bucket: bucket!,
    Key: key,
    Body: fileStream,
    ACL: 'public-read',
  }).promise();
  return `${endpoint}/${bucket}/${key}`;
}

export async function deleteFromYOS(fileUrl: string): Promise<void> {
  const url = new URL(fileUrl);
  const key = url.pathname.replace(/^\//, '').replace(`${bucket}/`, '');
  await s3.deleteObject({
    Bucket: bucket!,
    Key: key,
  }).promise();
}
