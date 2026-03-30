import sharp from "sharp";
import { uploadToR2, downloadFromR2 } from "./r2";

export function thumbKey(r2Key: string): string {
  return `thumbs/${r2Key}`;
}

export function previewKey(r2Key: string): string {
  return `previews/${r2Key}`;
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer)
      .resize({ width: 200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (err) {
    console.error("Thumbnail generation failed (malformed image?):", err);
    return null;
  }
}

/** Generate a mid-res preview (500px wide) */
export async function generatePreview(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer)
      .resize({ width: 500, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    console.error("Preview generation failed:", err);
    return null;
  }
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
  if (!thumb) {
    throw new Error("Failed to generate thumbnail: unsupported or malformed image");
  }
  const key = thumbKey(r2Key);
  await uploadToR2(key, thumb, "image/jpeg");
  return key;
}

/**
 * Generate a mid-res preview and store it in R2.
 * Returns the preview R2 key.
 */
export async function generateAndStorePreview(
  r2Key: string,
  sourceBuffer?: Buffer
): Promise<string> {
  const buffer = sourceBuffer ?? (await downloadFromR2(r2Key));
  const preview = await generatePreview(buffer);
  if (!preview) {
    throw new Error("Failed to generate preview: unsupported or malformed image");
  }
  const key = previewKey(r2Key);
  await uploadToR2(key, preview, "image/jpeg");
  return key;
}
