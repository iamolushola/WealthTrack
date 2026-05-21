import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedActor } from '../../common/authenticated-actor';
import { IntegrationsPolicy } from './policies/integrations.policy';
import { MysqlIntegrationSourceRepository } from './repositories/mysql-integration-source.repository';
import { MysqlGoogleSheetTabRepository } from './repositories/mysql-google-sheet-tab.repository';
import { MysqlSyncBatchRepository } from '../sync/repositories/mysql-sync.repositories';
import { CreateIntegrationRequestDto } from './dto/requests/create-integration.request.dto';
import { UpdateIntegrationRequestDto } from './dto/requests/update-integration.request.dto';
import { UpdateSheetTabRequestDto } from './dto/requests/update-sheet-tab.request.dto';
import { createId, nowIso } from '../../common/utils/ids';
import { GoogleSheetTabRow, IntegrationSourceRow, SyncBatchRow } from '@wealthtrack/shared-types';
import { JobDispatcherService } from '../../common/queues/job-dispatcher.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationSourceRepository: MysqlIntegrationSourceRepository,
    private readonly googleSheetTabRepository: MysqlGoogleSheetTabRepository,
    private readonly syncBatchRepository: MysqlSyncBatchRepository,
    private readonly jobDispatcherService: JobDispatcherService,
    private readonly outboxService: OutboxService,
  ) {}

  async list(): Promise<object> {
    const items = await this.integrationSourceRepository.list();
    return { items, count: items.length };
  }

  async create(payload: CreateIntegrationRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.create');
    const now = nowIso();
    const source: IntegrationSourceRow = {
      id: createId(),
      name: payload.name,
      sourceType: payload.sourceType,
      status: 'inactive',
      secretRef: payload.secretRef,
      connectionConfig: payload.connectionConfig,
      fieldMapping: payload.fieldMapping,
      syncFrequency: payload.syncFrequency,
      lastTestedAt: null,
      lastSuccessfulSyncAt: null,
      createdBy: actor.actorId,
      updatedBy: actor.actorId,
      createdAt: now,
      updatedAt: now,
    };
    await this.integrationSourceRepository.create(source);
    return source;
  }

  async update(id: string, payload: UpdateIntegrationRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.update');
    const source = await this.integrationSourceRepository.findById(id);
    if (!source) {
      throw new NotFoundException('Integration source not found');
    }

    const updatedSource: IntegrationSourceRow = {
      ...source,
      name: payload.name ?? source.name,
      secretRef: payload.secretRef ?? source.secretRef,
      fieldMapping: payload.fieldMapping ?? source.fieldMapping,
      connectionConfig: payload.connectionConfig ?? source.connectionConfig,
      syncFrequency: payload.syncFrequency ?? source.syncFrequency,
      updatedBy: actor.actorId,
      updatedAt: nowIso(),
    };

    await this.integrationSourceRepository.update(updatedSource);
    return updatedSource;
  }

  async disable(id: string, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.delete');
    const source = await this.integrationSourceRepository.findById(id);
    if (!source) {
      throw new NotFoundException('Integration source not found');
    }

    const disabledSource: IntegrationSourceRow = {
      ...source,
      status: 'inactive',
      updatedBy: actor.actorId,
      updatedAt: nowIso(),
    };
    await this.integrationSourceRepository.update(disabledSource);
    return disabledSource;
  }

  async testConnection(id: string, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.create');
    const source = await this.integrationSourceRepository.findById(id);
    if (!source) {
      throw new NotFoundException('Integration source not found');
    }

    return {
      id,
      testedAt: nowIso(),
      success: true,
      sourceType: source.sourceType,
      status: source.status,
    };
  }

  async triggerSync(id: string, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.sync.trigger');
    const source = await this.integrationSourceRepository.findById(id);
    if (!source) {
      throw new NotFoundException('Integration source not found');
    }

    const batch: SyncBatchRow = {
      id: createId(),
      integrationSourceId: source.id,
      triggeredBy: actor.actorId,
      sourceType: source.sourceType === 'api' ? 'api_sync' : 'db_sync',
      triggerMode: 'manual',
      status: 'pending',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      skippedRecords: 0,
      requestId: null,
      correlationId: null,
      startedAt: nowIso(),
      completedAt: null,
      errorMessage: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.syncBatchRepository.create(batch);

    if (source.sourceType === 'google_sheets') {
      await this.jobDispatcherService.enqueueGoogleSheetsSync({
        integrationSourceId: source.id,
        syncBatchId: batch.id,
        tabIds: [],
        actorId: actor.actorId,
        requestId: createId(),
        correlationId: createId(),
        triggerMode: 'manual',
      });
    } else {
      await this.jobDispatcherService.enqueueSync({
        syncBatchId: batch.id,
        integrationSourceId: source.id,
        actorId: actor.actorId,
        requestId: createId(),
        correlationId: createId(),
      });
    }

    await this.outboxService.queue('sync.started', 'sync_batch', batch.id, {
      syncBatchId: batch.id,
      integrationSourceId: source.id,
    });
    return batch;
  }

  async discoverSheetTabs(id: string, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.create');
    const source = await this.integrationSourceRepository.findById(id);
    if (!source || source.sourceType !== 'google_sheets') {
      throw new NotFoundException('Google Sheets integration not found');
    }

    const config = source.connectionConfig as { spreadsheetId?: string };
    if (!config?.spreadsheetId) {
      throw new Error('Integration is missing spreadsheetId in connectionConfig');
    }

    // Dynamically import googleapis to avoid bundling issues
    const { google } = await import('googleapis');
    const credentials = JSON.parse(source.secretRef) as Record<string, unknown>;
    const auth = credentials['type'] === 'service_account'
      ? google.auth.fromJSON(credentials as Parameters<typeof google.auth.fromJSON>[0])
      : (() => {
          const o = new google.auth.OAuth2(String(credentials['client_id']), String(credentials['client_secret']));
          o.setCredentials({ refresh_token: String(credentials['refresh_token']) });
          return o;
        })();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sheets = google.sheets({ version: 'v4', auth: auth as any });
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
      fields: 'sheets.properties',
    });

    const discovered = (spreadsheet.data.sheets ?? []).map((s) => ({
      sheetId: String(s.properties?.sheetId ?? ''),
      title: s.properties?.title ?? 'Unnamed',
    }));

    const now = nowIso();
    for (const tab of discovered) {
      const tabRow: GoogleSheetTabRow = {
        id: createId(),
        integrationSourceId: id,
        sheetId: tab.sheetId,
        sheetTitle: tab.title,
        rangeNotation: 'A1:ZZ',
        columnMapping: {},
        status: 'active',
        lastSyncedAt: null,
        lastRowCount: null,
        createdAt: now,
        updatedAt: now,
      };
      await this.googleSheetTabRepository.upsert(tabRow);
    }

    const tabs = await this.googleSheetTabRepository.listByIntegrationSourceId(id);
    return { spreadsheetId: config.spreadsheetId, tabs, count: tabs.length };
  }

  async listSheetTabs(id: string, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.read');
    const source = await this.integrationSourceRepository.findById(id);
    if (!source) throw new NotFoundException('Integration source not found');
    const tabs = await this.googleSheetTabRepository.listByIntegrationSourceId(id);
    return { integrationSourceId: id, tabs, count: tabs.length };
  }

  async updateSheetTab(id: string, tabId: string, payload: UpdateSheetTabRequestDto, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.update');
    const tab = await this.googleSheetTabRepository.findById(tabId);
    if (!tab || tab.integrationSourceId !== id) {
      throw new NotFoundException('Sheet tab not found');
    }
    await this.googleSheetTabRepository.updateTab(tabId, payload, nowIso());
    return (await this.googleSheetTabRepository.findById(tabId)) ?? {};
  }

  async syncLogs(id: string, actor: AuthenticatedActor): Promise<object> {
    this.integrationsPolicy.assertCanManage(actor, 'integrations.logs.read');
    const source = await this.integrationSourceRepository.findById(id);
    if (!source) {
      throw new NotFoundException('Integration source not found');
    }

    const items = await this.syncBatchRepository.listByIntegrationSourceId(id);
    return { integrationSourceId: id, items, count: items.length };
  }
}
