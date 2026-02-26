import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Listener for obsolete file deletion events.
   * This handles the background cleanup after a profile image is updated.
   */
  @EventPattern('file.delete_obsolete')
  async handleObsoleteFileDeletion(@Payload() data: { url: string }) {
    if (!data.url) {
      this.logger.warn('Received deletion event without a valid URL.');
      return;
    }

    this.logger.log(`Received request to delete obsolete file: ${data.url}`);
    
    // Pass the URL in an array as expected by the StorageService.deleteFiles method
    await this.storageService.deleteFiles([data.url]);
  }
}