import test from 'node:test';
import assert from 'node:assert/strict';
import { MysqlService } from '../src/persistence/mysql/mysql.service';
import { MysqlRoleRepository } from '../src/modules/rbac/repositories/mysql-rbac.repositories';
import { MysqlUserRepository } from '../src/modules/users/repositories/mysql-user.repository';
import { MysqlUploadBatchRepository } from '../src/modules/uploads/repositories/mysql-uploads.repositories';
import { MysqlReportExportRepository } from '../src/modules/reports/repositories/mysql-report-export.repository';
import { MysqlIntegrationSourceRepository } from '../src/modules/integrations/repositories/mysql-integration-source.repository';
import { createId, nowIso } from '../src/common/utils/ids';
import { hashPassword } from '../src/common/utils/password';

process.env.MYSQL_HOST ??= '127.0.0.1';
process.env.MYSQL_PORT ??= '3307';
process.env.MYSQL_USER ??= 'root';
process.env.MYSQL_PASSWORD ??= 'root';
process.env.MYSQL_DATABASE ??= 'wealthtrack';

const mysql = new MysqlService();

test.before(async () => {
  await mysql.onModuleInit();
});

test.after(async () => {
  await mysql.onModuleDestroy();
});

test.beforeEach(async () => {
  await mysql.execute('DELETE FROM sync_batch_errors');
  await mysql.execute('DELETE FROM outbox_events');
  await mysql.execute('DELETE FROM investment_records');
  await mysql.execute('DELETE FROM upload_validation_errors');
  await mysql.execute('DELETE FROM upload_batch_rows');
  await mysql.execute('DELETE FROM sync_batches');
  await mysql.execute('DELETE FROM report_exports');
  await mysql.execute('DELETE FROM integration_sources');
  await mysql.execute('DELETE FROM upload_batches');
  await mysql.execute('DELETE FROM idempotency_keys');
  await mysql.execute("DELETE FROM users WHERE email LIKE 'integration.%@wealthtrack.test'");
});

test('MysqlUserRepository creates, reads, and updates users against migrated schema', async () => {
  const roleRepository = new MysqlRoleRepository(mysql);
  const userRepository = new MysqlUserRepository(mysql);
  const adminRole = await roleRepository.findByCode('admin');
  assert.ok(adminRole, 'expected seeded admin role');

  const userId = createId();
  await userRepository.create({
    id: userId,
    name: 'Integration User',
    email: `integration.${Date.now()}@wealthtrack.test`,
    passwordHash: hashPassword('integration-pass-123'),
    roleId: adminRole.id,
    status: 'active',
    lastLoginAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
  });

  const createdUser = await userRepository.findById(userId);
  assert.ok(createdUser);
  assert.equal(createdUser?.name, 'Integration User');

  await userRepository.update({
    ...createdUser!,
    name: 'Updated Integration User',
    updatedAt: nowIso(),
  });

  const updatedUser = await userRepository.findById(userId);
  assert.equal(updatedUser?.name, 'Updated Integration User');
});

test('MysqlUploadBatchRepository persists batch lifecycle state', async () => {
  const roleRepository = new MysqlRoleRepository(mysql);
  const userRepository = new MysqlUserRepository(mysql);
  const uploadBatchRepository = new MysqlUploadBatchRepository(mysql);
  const adminRole = await roleRepository.findByCode('admin');
  assert.ok(adminRole, 'expected seeded admin role');

  const uploaderId = createId();
  await userRepository.create({
    id: uploaderId,
    name: 'Batch User',
    email: `integration.batch.${Date.now()}@wealthtrack.test`,
    passwordHash: hashPassword('integration-pass-123'),
    roleId: adminRole.id,
    status: 'active',
    lastLoginAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
  });

  const batchId = createId();
  await uploadBatchRepository.create({
    id: batchId,
    fileName: 'integration.csv',
    fileUrl: 'https://example.com/integration.csv',
    fileChecksum: 'abc123',
    uploadedBy: uploaderId,
    status: 'pending',
    totalRows: 10,
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    skippedRows: 0,
    previewExpiresAt: null,
    errorFileUrl: null,
    processingStartedAt: null,
    completedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    createdBy: uploaderId,
    updatedBy: uploaderId,
  });

  await uploadBatchRepository.updateStatus(batchId, 'validated');
  const batch = await uploadBatchRepository.findById(batchId);
  assert.ok(batch);
  assert.equal(batch?.status, 'validated');

  const history = await uploadBatchRepository.listByUploader(uploaderId);
  assert.equal(history.length, 1);
});

test('MysqlReportExportRepository and MysqlIntegrationSourceRepository read and write migrated tables', async () => {
  const roleRepository = new MysqlRoleRepository(mysql);
  const userRepository = new MysqlUserRepository(mysql);
  const reportExportRepository = new MysqlReportExportRepository(mysql);
  const integrationSourceRepository = new MysqlIntegrationSourceRepository(mysql);
  const adminRole = await roleRepository.findByCode('admin');
  assert.ok(adminRole, 'expected seeded admin role');

  const userId = createId();
  await userRepository.create({
    id: userId,
    name: 'Reporting User',
    email: `integration.report.${Date.now()}@wealthtrack.test`,
    passwordHash: hashPassword('integration-pass-123'),
    roleId: adminRole.id,
    status: 'active',
    lastLoginAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
  });

  const exportId = createId();
  await reportExportRepository.create({
    id: exportId,
    reportType: 'summary',
    outputFormat: 'csv',
    requestedBy: userId,
    filtersJson: { period: 'monthly' },
    status: 'pending',
    fileUrl: null,
    fileSizeBytes: null,
    checksum: null,
    errorMessage: null,
    requestId: null,
    correlationId: null,
    expiresAt: null,
    createdAt: nowIso(),
    completedAt: null,
  });

  const createdExport = await reportExportRepository.findById(exportId);
  assert.ok(createdExport);
  assert.equal(createdExport?.reportType, 'summary');

  const sourceId = createId();
  await integrationSourceRepository.create({
    id: sourceId,
    name: 'Integration Source',
    sourceType: 'api',
    status: 'inactive',
    secretRef: 'vault://integration/source',
    connectionConfig: { baseUrl: 'https://internal.example.com' },
    fieldMapping: { customerId: 'customer_id' },
    syncFrequency: 'manual',
    lastTestedAt: null,
    lastSuccessfulSyncAt: null,
    createdBy: userId,
    updatedBy: userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  const source = await integrationSourceRepository.findById(sourceId);
  assert.ok(source);
  assert.equal(source?.name, 'Integration Source');
});
