import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface R2Cache {
  client: S3Client | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _r2Cache: R2Cache | undefined;
}

const cached: R2Cache = globalThis._r2Cache ?? { client: null };
if (!globalThis._r2Cache) globalThis._r2Cache = cached;

function getClient(): S3Client {
  if (cached.client) return cached.client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)"
    );
  }

  cached.client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return cached.client;
}

function bucket(): string {
  return process.env.R2_BUCKET_NAME || "ecl-media";
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key })
  );
}

export async function deleteManyFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  // DeleteObjects supports max 1000 keys per request
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000));
  }
  for (const chunk of chunks) {
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      })
    );
  }
}

export async function headR2Object(key: string): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn }
  );
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}
