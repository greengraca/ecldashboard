import sharp from "sharp";
import { uploadToR2, downloadFromR2 } from "./r2";

export function thumbKey(r2Key: string): string {
  return `thumbs/${r2Key}`;
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 200, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Generate a thumbnail and store it in R2.
 * If no sourceBuffer is provided, downloads the original from R2 first.
 * Returns the thumb R2 key.
 */
export async function generateAndStoreThumbnail(
  r2Key: string,
  sourceBuffer?: Buffer
): Promise<string> {
  const buffer = sourceBuffer ?? (await downloadFromR2(r2Key));
  const thumb = await generateThumbnail(buffer);
  const key = thumbKey(r2Key);
  await uploadToR2(key, thumb, "image/jpeg");
  return key;
}
