require('reflect-metadata');

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdir, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const IORedis = require('ioredis');
const { AppModule } = require('../dist/apps/api/src/app.module.js');
const { WorkerModule } = require('../../worker/dist/worker.module.js');
const { MysqlService } = require('../dist/apps/api/src/persistence/mysql/mysql.service.js');
const { MysqlRoleRepository } = require('../dist/apps/api/src/modules/rbac/repositories/mysql-rbac.repositories.js');
const { MysqlUserRepository } = require('../dist/apps/api/src/modules/users/repositories/mysql-user.repository.js');
const { createId, nowIso } = require('../dist/apps/api/src/common/utils/ids.js');
const { hashPassword } = require('../dist/apps/api/src/common/utils/password.js');

process.env.MYSQL_HOST ??= '127.0.0.1';
process.env.MYSQL_PORT ??= '3307';
process.env.MYSQL_USER ??= 'root';
process.env.MYSQL_PASSWORD ??= 'root';
process.env.MYSQL_DATABASE ??= 'wealthtrack';
process.env.REDIS_HOST ??= '127.0.0.1';
process.env.REDIS_PORT ??= '6380';

const mysql = new MysqlService();
const redis = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

let baseUrl = '';
let actorId = '';
let apiApp;
let workerApp;

function actorHeaders(permissions) {
  return actorHeadersFor(actorId, permissions);
}

function actorHeadersFor(currentActorId, permissions) {
  return {
    'content-type': 'application/json',
    'x-actor-id': currentActorId,
    'x-actor-type': 'user',
    'x-permissions': permissions.join(','),
  };
}

async function requestJson(method, route, permissions, body) {
  return requestJsonAs(method, route, actorId, permissions, body);
}

async function requestJsonAs(method, route, currentActorId, permissions, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: actorHeadersFor(currentActorId, permissions),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function waitFor(label, probe, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await probe();
    if (value !== null) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function seedActor() {
  const roleRepository = new MysqlRoleRepository(mysql);
  const userRepository = new MysqlUserRepository(mysql);
  const adminRole = await roleRepository.findByCode('admin');
  assert.ok(adminRole, 'expected seeded admin role');

  const userId = createId();
  await userRepository.create({
    id: userId,
    name: 'Controller Integration Actor',
    email: `integration.controller.${Date.now()}@wealthtrack.test`,
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

  return userId;
}

async function resetPersistence() {
  await redis.flushdb();
  await rm(path.join(process.cwd(), 'tmp'), { recursive: true, force: true });
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
  await mysql.execute("DELETE FROM users WHERE email LIKE 'integration.controller.%@wealthtrack.test'");
}

test.before(async () => {
  await mysql.onModuleInit();
  apiApp = await NestFactory.create(AppModule, { logger: false });
  apiApp.setGlobalPrefix('api/v1');
  apiApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await apiApp.listen(0, '127.0.0.1');
  baseUrl = await apiApp.getUrl();

  workerApp = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
});

test.after(async () => {
  await workerApp.close();
  await apiApp.close();
  await mysql.onModuleDestroy();
  await redis.quit();
});

test.beforeEach(async () => {
  await resetPersistence();
  actorId = await seedActor();
});

test('controller workflow processes CSV upload through queued validation and import', async () => {
  const fixtureDir = path.join(process.cwd(), 'tmp', 'fixtures');
  await mkdir(fixtureDir, { recursive: true });
  const csvPath = path.join(fixtureDir, `upload-${Date.now()}.csv`);
  await writeFile(
    csvPath,
    [
      'customer_id,customer_name,customer_type,mobilisation_date,investment_amount,fund_type,tenor_days,maturity_date,investment_reference,currency,source_channel,relationship_manager,cost_of_funds',
      'CUST-001,Ada Lovelace,new,2024-01-10,1500000.00,inflow,90,2024-04-09,INV-001,NGN,branch,RM-1,0.120000',
      'CUST-002,Grace Hopper,returning,2024-02-12,2000000.00,rollover,180,2024-08-10,INV-002,NGN,digital,RM-2,0.110000',
    ].join('\n'),
    'utf8',
  );

  const createUpload = await requestJson('POST', '/api/v1/uploads/csv', ['uploads.csv.create'], {
    fileName: 'controller-fixture.csv',
    fileUrl: pathToFileURL(csvPath).toString(),
    fileChecksum: 'fixture-checksum-001',
  });

  if (createUpload.status !== 201) {
    throw new Error(`createUpload failed: ${JSON.stringify(createUpload)}`);
  }
  assert.equal(createUpload.status, 201);
  const batchId = createUpload.data.id;

  const validatedBatch = await waitFor('validated upload batch', async () => {
    const batch = await mysql.selectOne('SELECT status, valid_rows AS validRows FROM upload_batches WHERE id = ?', [batchId]);
    return batch && batch.status === 'validated' ? batch : null;
  });
  assert.equal(validatedBatch.validRows, 2);

  const preview = await requestJson('GET', `/api/v1/uploads/${batchId}/preview`, ['uploads.preview.read']);
  assert.equal(preview.status, 200);
  assert.equal(preview.data.rows.length, 2);
  assert.equal(preview.data.errors.length, 0);

  const validationSummary = await requestJson('GET', `/api/v1/validation/batches/${batchId}`, ['uploads.preview.read']);
  assert.equal(validationSummary.status, 200);
  assert.equal(validationSummary.data.batch.id, batchId);
  assert.equal(validationSummary.data.counts.valid, 2);
  assert.equal(validationSummary.data.counts.errors, 0);

  const confirm = await requestJson('POST', `/api/v1/uploads/${batchId}/confirm`, ['uploads.import.confirm']);
  if (confirm.status !== 201) {
    throw new Error(`confirm failed: ${JSON.stringify(confirm)}`);
  }
  assert.equal(confirm.status, 201);
  assert.equal(confirm.data.status, 'queued');

  const importedBatch = await waitFor('imported upload batch', async () => {
    const batch = await mysql.selectOne('SELECT status FROM upload_batches WHERE id = ?', [batchId]);
    return batch && batch.status === 'imported' ? batch : null;
  });
  assert.equal(importedBatch.status, 'imported');

  const importedCount = await waitFor('imported investment records', async () => {
    const row = await mysql.selectOne('SELECT COUNT(*) AS count FROM investment_records WHERE import_batch_id = ?', [batchId]);
    return row && row.count === 2 ? row : null;
  });
  assert.equal(importedCount.count, 2);

  const investmentsResponse = await requestJson(
    'GET',
    '/api/v1/investments/CUST-001',
    ['dashboard.customer_portfolio.read'],
  );
  assert.equal(investmentsResponse.status, 200);
  assert.equal(investmentsResponse.data.customerId, 'CUST-001');
  assert.equal(investmentsResponse.data.confirmedValidCount, 1);

  const dispatchedEvents = await waitFor('upload outbox dispatch', async () => {
    const row = await mysql.selectOne('SELECT COUNT(*) AS count FROM outbox_events WHERE aggregate_id = ? AND status = ?', [batchId, 'dispatched']);
    return row && row.count >= 2 ? row : null;
  });
  assert.equal(dispatchedEvents.count, 2);
});

test('controller workflow queues report generation and integration sync end to end', async () => {
  await mysql.execute('INSERT INTO investment_records SET ?', [
    {
      id: createId(),
      customerId: 'REPORT-001',
      customerName: 'Report Seed',
      customerType: 'returning',
      mobilisationDate: '2024-01-05',
      investmentAmount: '500000.0000',
      fundType: 'inflow',
      tenorDays: 90,
      tenorCategory: 'short_term',
      maturityDate: '2024-04-04',
      investmentReference: 'REPORT-SEED-001',
      currency: 'NGN',
      sourceChannel: 'branch',
      relationshipManager: 'RM-REPORT',
      costOfFunds: '0.090000',
      importBatchId: null,
      uploadBatchRowId: null,
      syncBatchId: null,
      dataSource: 'api_sync',
      importStatus: 'confirmed',
      recordStatus: 'valid',
      sourceRecordHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      confirmedBy: actorId,
      confirmedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actorId,
      updatedBy: actorId,
    },
  ]);

  const reportResponse = await requestJson('POST', '/api/v1/reports/export', ['reports.export'], {
    reportType: 'summary',
    outputFormat: 'csv',
    filtersJson: { period: 'monthly' },
  });
  assert.equal(reportResponse.status, 201);

  const completedReport = await waitFor('completed report export', async () => {
    const report = await mysql.selectOne('SELECT status, file_url AS fileUrl FROM report_exports WHERE id = ?', [reportResponse.data.id]);
    return report && report.status === 'completed' && report.fileUrl ? report : null;
  });
  assert.match(completedReport.fileUrl, /tmp\/reports/);

  const reportDownload = await requestJson('GET', `/api/v1/reports/${reportResponse.data.id}/download`, ['reports.export']);
  assert.equal(reportDownload.status, 200);
  assert.equal(reportDownload.data.status, 'completed');

  const integrationResponse = await requestJson('POST', '/api/v1/integrations', ['integrations.create'], {
    name: `Controller Sync ${Date.now()}`,
    sourceType: 'api',
    secretRef: 'vault://controller/sync',
    fieldMapping: { customerId: 'customerId' },
    connectionConfig: {
      records: [
        {
          customerId: 'SYNC-001',
          customerName: 'Sync Customer',
          customerType: 'new',
          mobilisationDate: '2024-03-01',
          investmentAmount: '2750000.00',
          fundType: 'inflow',
          tenorDays: 120,
          tenorCategory: 'short_term',
          maturityDate: '2024-06-29',
          investmentReference: 'SYNC-REF-001',
          currency: 'NGN',
        },
      ],
    },
    syncFrequency: 'manual',
  });
  assert.equal(integrationResponse.status, 201);

  const syncResponse = await requestJson('POST', `/api/v1/integrations/${integrationResponse.data.id}/sync`, ['integrations.sync.trigger']);
  assert.equal(syncResponse.status, 201);

  const completedSync = await waitFor('completed sync batch', async () => {
    const syncBatch = await mysql.selectOne('SELECT status, valid_records AS validRecords FROM sync_batches WHERE id = ?', [syncResponse.data.id]);
    return syncBatch && syncBatch.status === 'success' ? syncBatch : null;
  });
  assert.equal(completedSync.validRecords, 1);

  const syncBatchResponse = await requestJson(
    'GET',
    `/api/v1/sync/batches/${syncResponse.data.id}`,
    ['integrations.logs.read'],
  );
  assert.equal(syncBatchResponse.status, 200);
  assert.equal(syncBatchResponse.data.batch.id, syncResponse.data.id);
  assert.equal(syncBatchResponse.data.batch.status, 'success');
  assert.equal(syncBatchResponse.data.errorCount, 0);

  const syncedRecord = await waitFor('synced investment record', async () => {
    const row = await mysql.selectOne('SELECT COUNT(*) AS count FROM investment_records WHERE sync_batch_id = ?', [syncResponse.data.id]);
    return row && row.count === 1 ? row : null;
  });
  assert.equal(syncedRecord.count, 1);

  const outboxEvents = await waitFor('report and sync outbox dispatch', async () => {
    const row = await mysql.selectOne('SELECT COUNT(*) AS count FROM outbox_events WHERE status = ?', ['dispatched']);
    return row && row.count >= 2 ? row : null;
  });
  assert.ok(outboxEvents.count >= 2);
});

test('controller workflow returns validation summaries, customer investments, and sync batch details', async () => {
  const batchId = createId();
  const syncBatchId = createId();
  const integrationSourceId = createId();

  await mysql.execute('INSERT INTO upload_batches SET ?', [
    {
      id: batchId,
      fileName: 'validation-summary.csv',
      fileUrl: 'file:///tmp/validation-summary.csv',
      fileChecksum: 'validation-summary-checksum',
      uploadedBy: actorId,
      status: 'validated',
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
      duplicateRows: 0,
      skippedRows: 0,
      previewExpiresAt: null,
      errorFileUrl: null,
      processingStartedAt: nowIso(),
      completedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actorId,
      updatedBy: actorId,
    },
  ]);

  await mysql.execute('INSERT INTO upload_batch_rows SET ?', [
    {
      id: createId(),
      uploadBatchId: batchId,
      csvRowNumber: 1,
      customerId: 'VALIDATION-001',
      customerName: 'Validation Customer',
      customerType: 'new',
      mobilisationDate: '2024-02-01',
      investmentAmount: '1500000.0000',
      fundType: 'inflow',
      tenorDays: 90,
      tenorCategory: 'short_term',
      maturityDate: '2024-05-01',
      investmentReference: 'VALIDATION-REF-001',
      currency: 'NGN',
      sourceChannel: 'branch',
      relationshipManager: 'RM-VALID',
      costOfFunds: '0.120000',
      sourceRecordHash: '1111111111111111111111111111111111111111111111111111111111111111',
      rowStatus: 'valid',
      rawPayloadJson: { row: 1 },
      normalizedPayloadJson: { row: 1 },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]);

  await mysql.execute('INSERT INTO upload_batch_rows SET ?', [
    {
      id: createId(),
      uploadBatchId: batchId,
      csvRowNumber: 2,
      customerId: 'VALIDATION-002',
      customerName: 'Broken Customer',
      customerType: 'returning',
      mobilisationDate: null,
      investmentAmount: null,
      fundType: 'rollover',
      tenorDays: null,
      tenorCategory: 'unclassified',
      maturityDate: null,
      investmentReference: 'VALIDATION-REF-002',
      currency: 'NGN',
      sourceChannel: 'digital',
      relationshipManager: 'RM-INVALID',
      costOfFunds: null,
      sourceRecordHash: '2222222222222222222222222222222222222222222222222222222222222222',
      rowStatus: 'invalid',
      rawPayloadJson: { row: 2 },
      normalizedPayloadJson: { row: 2 },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]);

  await mysql.execute('INSERT INTO upload_validation_errors SET ?', [
    {
      id: createId(),
      uploadBatchId: batchId,
      uploadBatchRowId: null,
      csvRowNumber: 2,
      fieldName: 'investmentAmount',
      errorCode: 'required',
      errorMessage: 'Investment amount is required',
      originalValue: null,
      createdAt: nowIso(),
    },
  ]);

  await mysql.execute('INSERT INTO integration_sources SET ?', [
    {
      id: integrationSourceId,
      name: `Validation Sync Source ${Date.now()}`,
      sourceType: 'api',
      status: 'active',
      secretRef: 'vault://integration/validation-sync',
      connectionConfig: { mode: 'fixture' },
      fieldMapping: { customerId: 'customerId' },
      syncFrequency: 'manual',
      lastTestedAt: nowIso(),
      lastSuccessfulSyncAt: null,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]);

  await mysql.execute('INSERT INTO sync_batches SET ?', [
    {
      id: syncBatchId,
      integrationSourceId,
      triggeredBy: actorId,
      sourceType: 'api_sync',
      triggerMode: 'manual',
      status: 'failed',
      totalRecords: 1,
      validRecords: 0,
      invalidRecords: 1,
      duplicateRecords: 0,
      skippedRecords: 0,
      requestId: createId(),
      correlationId: createId(),
      startedAt: nowIso(),
      completedAt: nowIso(),
      errorMessage: 'Upstream payload validation failed',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]);

  await mysql.execute('INSERT INTO sync_batch_errors SET ?', [
    {
      id: createId(),
      syncBatchId,
      sourceRecordIdentifier: 'SYNC-VALIDATION-001',
      errorCode: 'invalid_payload',
      errorMessage: 'Payload was missing mobilisation date',
      rawPayloadJson: { customerId: 'SYNC-VALIDATION-001' },
      createdAt: nowIso(),
    },
  ]);

  await mysql.execute('INSERT INTO investment_records SET ?', [
    {
      id: createId(),
      customerId: 'CUSTOMER-HISTORY-001',
      customerName: 'History Customer',
      customerType: 'returning',
      mobilisationDate: '2024-01-15',
      investmentAmount: '1000000.0000',
      fundType: 'inflow',
      tenorDays: 90,
      tenorCategory: 'short_term',
      maturityDate: '2024-04-14',
      investmentReference: 'HISTORY-REF-001',
      currency: 'NGN',
      sourceChannel: 'branch',
      relationshipManager: 'RM-HISTORY',
      costOfFunds: '0.100000',
      importBatchId: batchId,
      uploadBatchRowId: null,
      syncBatchId: null,
      dataSource: 'csv_upload',
      importStatus: 'confirmed',
      recordStatus: 'valid',
      sourceRecordHash: '3333333333333333333333333333333333333333333333333333333333333333',
      confirmedBy: actorId,
      confirmedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actorId,
      updatedBy: actorId,
    },
  ]);

  await mysql.execute('INSERT INTO investment_records SET ?', [
    {
      id: createId(),
      customerId: 'CUSTOMER-HISTORY-001',
      customerName: 'History Customer',
      customerType: 'returning',
      mobilisationDate: '2024-02-20',
      investmentAmount: '750000.0000',
      fundType: 'rollover',
      tenorDays: 180,
      tenorCategory: 'mid_short_term',
      maturityDate: '2024-08-18',
      investmentReference: 'HISTORY-REF-002',
      currency: 'NGN',
      sourceChannel: 'digital',
      relationshipManager: 'RM-HISTORY',
      costOfFunds: '0.095000',
      importBatchId: batchId,
      uploadBatchRowId: null,
      syncBatchId: null,
      dataSource: 'csv_upload',
      importStatus: 'pending',
      recordStatus: 'duplicate',
      sourceRecordHash: '4444444444444444444444444444444444444444444444444444444444444444',
      confirmedBy: null,
      confirmedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actorId,
      updatedBy: actorId,
    },
  ]);

  const validationResponse = await requestJson('GET', `/api/v1/validation/batches/${batchId}`, ['uploads.preview.read']);
  assert.equal(validationResponse.status, 200);
  assert.equal(validationResponse.data.batch.id, batchId);
  assert.equal(validationResponse.data.counts.rows, 2);
  assert.equal(validationResponse.data.counts.errors, 1);
  assert.equal(validationResponse.data.counts.valid, 1);
  assert.equal(validationResponse.data.counts.invalid, 1);

  const investmentsResponse = await requestJson('GET', '/api/v1/investments/CUSTOMER-HISTORY-001', ['dashboard.customer_portfolio.read']);
  assert.equal(investmentsResponse.status, 200);
  assert.equal(investmentsResponse.data.customerId, 'CUSTOMER-HISTORY-001');
  assert.equal(investmentsResponse.data.count, 2);
  assert.equal(investmentsResponse.data.confirmedValidCount, 1);

  const syncResponse = await requestJson('GET', `/api/v1/sync/batches/${syncBatchId}`, ['integrations.logs.read']);
  assert.equal(syncResponse.status, 200);
  assert.equal(syncResponse.data.batch.id, syncBatchId);
  assert.equal(syncResponse.data.batch.status, 'failed');
  assert.equal(syncResponse.data.errorCount, 1);
  assert.equal(syncResponse.data.errors[0].errorCode, 'invalid_payload');
});

test('controller workflow enforces permissions, ownership, and not-found behavior for validation, investments, and sync', async () => {
  const roleRepository = new MysqlRoleRepository(mysql);
  const userRepository = new MysqlUserRepository(mysql);
  const adminRole = await roleRepository.findByCode('admin');
  assert.ok(adminRole, 'expected seeded admin role');

  const otherActorId = createId();
  await userRepository.create({
    id: otherActorId,
    name: 'Secondary Actor',
    email: `integration.secondary.${Date.now()}@wealthtrack.test`,
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

  const fixtureDir = path.join(process.cwd(), 'tmp', 'fixtures');
  await mkdir(fixtureDir, { recursive: true });
  const csvPath = path.join(fixtureDir, `guarded-upload-${Date.now()}.csv`);
  await writeFile(
    csvPath,
    [
      'customer_id,customer_name,customer_type,mobilisation_date,investment_amount,fund_type,tenor_days,maturity_date,investment_reference,currency,source_channel,relationship_manager,cost_of_funds',
      'GUARD-001,Guarded Customer,new,2024-01-10,1500000.00,inflow,90,2024-04-09,GUARD-REF-001,NGN,branch,RM-1,0.120000',
    ].join('\n'),
    'utf8',
  );

  const createUpload = await requestJson('POST', '/api/v1/uploads/csv', ['uploads.csv.create'], {
    fileName: 'guarded.csv',
    fileUrl: pathToFileURL(csvPath).toString(),
    fileChecksum: 'guarded-checksum-001',
  });
  assert.equal(createUpload.status, 201);

  const validatedBatch = await waitFor('guarded validated upload batch', async () => {
    const batch = await mysql.selectOne('SELECT status FROM upload_batches WHERE id = ?', [createUpload.data.id]);
    return batch && batch.status === 'validated' ? batch : null;
  });
  assert.equal(validatedBatch.status, 'validated');

  const integrationResponse = await requestJson('POST', '/api/v1/integrations', ['integrations.create'], {
    name: `Guarded Sync ${Date.now()}`,
    sourceType: 'api',
    secretRef: 'vault://controller/guarded-sync',
    fieldMapping: { customerId: 'customerId' },
    connectionConfig: {
      records: [
        {
          customerId: 'GUARD-SYNC-001',
          customerName: 'Guard Sync Customer',
          customerType: 'new',
          mobilisationDate: '2024-03-01',
          investmentAmount: '1750000.00',
          fundType: 'inflow',
          tenorDays: 120,
          tenorCategory: 'short_term',
          maturityDate: '2024-06-29',
          investmentReference: 'GUARD-SYNC-REF-001',
          currency: 'NGN',
        },
      ],
    },
    syncFrequency: 'manual',
  });
  assert.equal(integrationResponse.status, 201);

  const syncResponse = await requestJson('POST', `/api/v1/integrations/${integrationResponse.data.id}/sync`, ['integrations.sync.trigger']);
  assert.equal(syncResponse.status, 201);

  await waitFor('guarded sync completion', async () => {
    const syncBatch = await mysql.selectOne('SELECT status FROM sync_batches WHERE id = ?', [syncResponse.data.id]);
    return syncBatch && syncBatch.status === 'success' ? syncBatch : null;
  });

  const validationMissingPermission = await requestJson('GET', `/api/v1/validation/batches/${createUpload.data.id}`, []);
  assert.equal(validationMissingPermission.status, 403);

  const validationWrongOwner = await requestJsonAs(
    'GET',
    `/api/v1/validation/batches/${createUpload.data.id}`,
    otherActorId,
    ['uploads.preview.read'],
  );
  assert.equal(validationWrongOwner.status, 403);

  const validationNotFound = await requestJson('GET', `/api/v1/validation/batches/${createId()}`, ['uploads.preview.read']);
  assert.equal(validationNotFound.status, 404);

  const investmentsMissingPermission = await requestJson('GET', '/api/v1/investments/GUARD-001', []);
  assert.equal(investmentsMissingPermission.status, 403);

  const syncMissingPermission = await requestJson('GET', `/api/v1/sync/batches/${syncResponse.data.id}`, []);
  assert.equal(syncMissingPermission.status, 403);

  const syncWrongOwner = await requestJsonAs(
    'GET',
    `/api/v1/sync/batches/${syncResponse.data.id}`,
    otherActorId,
    ['integrations.logs.read'],
  );
  assert.equal(syncWrongOwner.status, 403);

  const syncNotFound = await requestJson('GET', `/api/v1/sync/batches/${createId()}`, ['integrations.logs.read']);
  assert.equal(syncNotFound.status, 404);
});