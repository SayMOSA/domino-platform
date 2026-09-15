import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY = 'CLOUDINARY';

// Provides a singleton, pre-configured Cloudinary SDK instance for injection into CloudinaryService.
export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    cloudinary.config({
      cloud_name: config.get<string>('cloudinary.cloudName'),
      api_key: config.get<string>('cloudinary.apiKey'),
      api_secret: config.get<string>('cloudinary.apiSecret'),
    });
    return cloudinary;
  },
};
