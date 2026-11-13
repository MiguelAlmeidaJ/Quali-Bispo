import { AttendancesController } from './attendances.controller';
import { ReportsController } from './reports.controller';
import { MemberController } from './member.controller';
import { PartnerAccessController } from './partner-access.controller';
import { CustomerBenefitsController } from './customer-benefits.controller';
import { CardPlansController } from './card-plans.controller';
import { BillingSettingsController } from './billing-settings.controller';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthController, AdminController } from './auth.controller';
import { DevController } from './dev.controller';
import { BrandingController, BrandingUploadController } from './branding.controller';
import { PartnersController, AdminPartnersController } from './partners.controller';
import { PublicCatalogController, AdminCatalogController } from './catalog.controller';
import { FinanceController } from './finance.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] })],
  controllers: [HealthController, AuthController, AdminController, DevController, BrandingController, BrandingUploadController, PartnersController, AdminPartnersController, PublicCatalogController, AdminCatalogController, FinanceController, AttendancesController, ReportsController, MemberController, CardPlansController, BillingSettingsController, PartnerAccessController, CustomerBenefitsController],
})
export class AppModule {}
