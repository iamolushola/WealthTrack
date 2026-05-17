import { Module } from '@nestjs/common';
import { JobDispatcherModule } from './common/queues/job-dispatcher.module';
import { MysqlModule } from './persistence/mysql/mysql.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ValidationModule } from './modules/validation/validation.module';
import { ImportsModule } from './modules/imports/imports.module';
import { InvestmentsModule } from './modules/investments/investments.module';
import { FundClassificationModule } from './modules/fund-classification/fund-classification.module';
import { TenorClassificationModule } from './modules/tenor-classification/tenor-classification.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    JobDispatcherModule,
    MysqlModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RbacModule,
    UploadsModule,
    ValidationModule,
    ImportsModule,
    InvestmentsModule,
    FundClassificationModule,
    TenorClassificationModule,
    AnalyticsModule,
    ReportsModule,
    IntegrationsModule,
    SyncModule,
    AuditModule,
    SettingsModule,
    NotificationsModule,
    OutboxModule,
    JobsModule,
  ],
})
export class AppModule {}
