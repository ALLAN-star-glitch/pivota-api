import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'multer'; 

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase!: SupabaseClient;

  constructor() {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!url || !key) {
      this.logger.error('Supabase credentials missing in .env');
      throw new Error('Storage configuration failed: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Uploads a file to a specified bucket.
   */
  async uploadFile(
    file: Express.Multer.File, 
    folder: string, 
    bucketName = 'pivota-public'
  ): Promise<string> {
    try {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;

      const { error } = await this.supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Supabase upload failed: ${error.message}`);
        throw error;
      }

      if (bucketName === 'pivota-public') {
        const { data: urlData } = this.supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
        return urlData.publicUrl;
      }

      return fileName;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      this.logger.error(`StorageService Error: ${errorMessage}`);
      throw new Error(`Could not upload file to storage: ${errorMessage}`);
    }
  }

  /**
   * Deletes multiple files from a bucket.
   * Useful for cleanup when a database transaction fails.
   * @param identifiers Can be full URLs or internal paths.
   */
  async deleteFiles(identifiers: string[], bucketName = 'pivota-public'): Promise<void> {
    if (!identifiers || identifiers.length === 0) return;

    try {
      // 1. Convert full URLs to internal paths if necessary
      // Example: https://.../pivota-public/houses/cat/file.jpg -> houses/cat/file.jpg
      const paths = identifiers.map((id) => {
        if (id.startsWith('http')) {
          const parts = id.split(`${bucketName}/`);
          return parts.length > 1 ? parts[1] : id;
        }
        return id;
      });

      // 2. Perform bulk deletion
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .remove(paths);

      if (error) {
        this.logger.error(`Supabase bulk delete failed: ${error.message}`);
        throw error;
      }

      this.logger.log(`Successfully cleaned up ${data?.length} orphaned files from ${bucketName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown delete error';
      this.logger.error(`Cleanup Error: ${errorMessage}`);
      // We don't necessarily want to crash the whole request if cleanup fails, 
      // but we log it for manual intervention.
    }
  }

  /**
   * Generates a temporary access link for files in 'pivota-private'
   */
  async getPrivateUrl(path: string, expiresIn = 900): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from('pivota-private')
        .createSignedUrl(path, expiresIn);

      if (error || !data) {
        throw new Error(error?.message || 'Failed to generate signed URL');
      }

      return data.signedUrl;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown URL error';
      this.logger.error(`Signed URL Error: ${errorMessage}`);
      throw new InternalServerErrorException('Could not generate secure link');
    }
  }
}