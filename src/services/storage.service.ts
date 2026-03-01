import { supabase } from '../integrations/supabase';
import { logger } from '../utils/logger';

const BUCKET = 'receipts';

/**
 * Uploads a receipt image buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadReceiptImage(
  imageBuffer: Buffer,
  fileName: string,
): Promise<string> {
  logger.info('Uploading image to Supabase Storage', { fileName });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  logger.info('Image uploaded successfully', { url: data.publicUrl });
  return data.publicUrl;
}
