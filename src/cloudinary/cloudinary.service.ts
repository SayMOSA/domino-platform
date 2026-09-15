import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { UploadApiResponse, v2 } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  constructor(@Inject(CLOUDINARY) private cloudinaryClient: typeof v2) {}

  // Streams an in-memory Multer buffer straight to Cloudinary (no temp files on disk).
  uploadImage(file: Express.Multer.File, folder = 'domino-platform/avatars'): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinaryClient.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // Called whenever a player replaces their avatar, so the old Cloudinary asset doesn't linger.
  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;
    await this.cloudinaryClient.uploader.destroy(publicId);
  }
}
