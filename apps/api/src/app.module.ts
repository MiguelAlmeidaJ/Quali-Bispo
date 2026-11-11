import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthController, AdminController } from './auth.controller';
import { DevController } from './dev.controller';
import { BrandingController, BrandingUploadController } from './branding.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] })],
  controllers: [HealthController, AuthController, AdminController, DevController, BrandingController, BrandingUploadController],
})
export class AppModule {}
