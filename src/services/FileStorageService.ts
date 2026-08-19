import { Service } from '@asenajs/asena/decorators';
import { HttpException } from '@asenajs/asena/adapter';
import * as path from 'node:path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Service()
export class FileStorageService {
  /**
   * Persists a profile image under public/uploads with a generated, safe file
   * name (original names are never trusted) and returns its public URL path.
   */
  public async saveProfileImage(file: File): Promise<string> {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new HttpException(400, { success: false, message: 'Max image size is 5MB' });
    }

    const extension = ALLOWED_IMAGE_TYPES[file.type];

    if (!extension) {
      throw new HttpException(400, {
        success: false,
        message: 'Only .jpg, .png and .webp formats are supported',
      });
    }

    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    // Bun.write creates missing parent directories automatically.
    await Bun.write(path.join(UPLOAD_DIR, fileName), file);

    return `/static/uploads/${fileName}`;
  }
}
