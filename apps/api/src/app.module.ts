import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthController, AdminController } from './auth.controller';
import { DevController } from './dev.controller';
import { BrandingController, BrandingUploadController } from './branding.controller';
import { PartnersController, AdminPartnersController } from './partners.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] })],
  controllers: [HealthController, AuthController, AdminController, DevController, BrandingController, BrandingUploadController, PartnersController, AdminPartnersController],
})
export class AppModule {}
