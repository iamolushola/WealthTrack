import { Injectable } from '@nestjs/common';
import { InvestmentRecordRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { CommissionFilters, CommissionRow, CommissionSummaryRow, InvestmentFilters, InvestmentListRow, InvestmentRecordRepository } from '../interfaces/investments.repositories';

@Injectable()
export class MysqlInvestmentRecordRepository implements InvestmentRecordRepository {
  constructor(private readonly mysql: MysqlService) {}

  findAll(cursor?: string, limit = 50): Promise<InvestmentRecordRow[]> {
    if (cursor) {
      return this.mysql.selectMany<InvestmentRecordRow>(
        'SELECT * FROM investment_records WHERE id > ? ORDER BY mobilisation_date DESC, id ASC LIMIT ?',
        [cursor, limit],
      );
    }

    return this.mysql.selectMany<InvestmentRecordRow>(
      'SELECT * FROM investment_records ORDER BY mobilisation_date DESC, id ASC LIMIT ?',
      [limit],
    );
  }

  private buildInvestmentWhere(filters: InvestmentFilters): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.q) {
      const like = `%${filters.q}%`;
      conditions.push('(ir.customer_name LIKE ? OR ir.customer_id LIKE ? OR ir.investment_reference LIKE ? OR ir.relationship_manager LIKE ?)');
      params.push(like, like, like, like);
    }
    if (filters.customerType) {
      conditions.push('ir.customer_type = ?');
      params.push(filters.customerType);
    }
    if (filters.fundType) {
      conditions.push('ir.fund_type = ?');
      params.push(filters.fundType);
    }
    if (filters.importStatus) {
      conditions.push('ir.import_status = ?');
      params.push(filters.importStatus);
    }
    if (filters.tenorCategory) {
      conditions.push('ir.tenor_category = ?');
      params.push(filters.tenorCategory);
    }
    if (filters.from) {
      conditions.push('ir.mobilisation_date >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('ir.mobilisation_date <= ?');
      params.push(filters.to);
    }

    return {
      sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  private buildCommissionWhere(filters: CommissionFilters): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.q) {
      const like = `%${filters.q}%`;
      conditions.push('(ir.customer_name LIKE ? OR ir.customer_id LIKE ? OR ir.investment_reference LIKE ? OR ir.relationship_manager LIKE ?)');
      params.push(like, like, like, like);
    }
    if (filters.customerType) {
      conditions.push('ir.customer_type = ?');
      params.push(filters.customerType);
    }
    if (filters.fundType) {
      conditions.push('ir.fund_type = ?');
      params.push(filters.fundType);
    }
    if (filters.from) {
      conditions.push('ir.mobilisation_date >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('ir.mobilisation_date <= ?');
      params.push(filters.to);
    }

    return {
      sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  findAllPaged(offset: number, limit: number, filters: InvestmentFilters = {}): Promise<InvestmentListRow[]> {
    const where = this.buildInvestmentWhere(filters);
    return this.mysql.selectMany<InvestmentListRow>(
      `SELECT
        ir.id, ir.customer_id AS customerId, ir.customer_name AS customerName,
        ir.customer_type AS customerType, ir.mobilisation_date AS mobilisationDate,
        ir.investment_amount AS investmentAmount, ir.fund_type AS fundType,
        ir.tenor_days AS tenorDays, ir.tenor_category AS tenorCategory,
        ir.maturity_date AS maturityDate, ir.investment_reference AS investmentReference,
        ir.currency, ir.source_channel AS sourceChannel,
        ir.relationship_manager AS relationshipManager, ir.cost_of_funds AS costOfFunds,
        ir.data_source AS dataSource, ir.import_status AS importStatus,
        ir.record_status AS recordStatus, ir.created_at AS createdAt, ir.updated_at AS updatedAt,
        IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$.Team')), NULL) AS team,
        CASE WHEN ir.maturity_date IS NOT NULL THEN DATEDIFF(ir.maturity_date, CURDATE()) ELSE NULL END AS days2Maturity
      FROM investment_records ir
      LEFT JOIN upload_batch_rows ubr ON ir.upload_batch_row_id = ubr.id
      ${where.sql}
      ORDER BY ir.mobilisation_date DESC, ir.id ASC
      LIMIT ? OFFSET ?`,
      [...where.params, limit, offset],
    );
  }

  private static readonly COMM_JSON_COLS = `
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WM.Nbt.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS wm_ntb_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WM.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS wm_retn_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."TM.Nbt.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS tm_ntb_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."TM.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS tm_retn_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OM.Ntb.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS om_ntb_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OM.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS om_retn_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OO.Ntb.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS oo_ntb_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OO.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS oo_retn_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WP.Funds.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS wp_funds_comm,
    CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WP.Team.Comm"')), '0'), ',', '') AS DECIMAL(19,4)) AS wp_team_comm
  `;

  findAllWithCommissions(offset: number, limit: number, filters: CommissionFilters = {}): Promise<CommissionRow[]> {
    const where = this.buildCommissionWhere(filters);
    return this.mysql.selectMany<CommissionRow>(
      `SELECT
        ir.id, ir.customer_id AS customerId, ir.customer_name AS customerName,
        ir.customer_type AS customerType, ir.relationship_manager AS relationshipManager,
        ir.investment_amount AS investmentAmount, ir.mobilisation_date AS mobilisationDate,
        ir.fund_type AS fundType, ir.tenor_days AS tenorDays,
        ir.investment_reference AS investmentReference, ir.currency,
        ir.source_channel AS sourceChannel, ir.import_status AS importStatus,
        ${MysqlInvestmentRecordRepository.COMM_JSON_COLS}
      FROM investment_records ir
      LEFT JOIN upload_batch_rows ubr ON ir.upload_batch_row_id = ubr.id
      ${where.sql}
      ORDER BY ir.mobilisation_date DESC, ir.id ASC
      LIMIT ? OFFSET ?`,
      [...where.params, limit, offset],
    );
  }

  async commissionSummary(filters: CommissionFilters = {}): Promise<CommissionSummaryRow> {
    const where = this.buildCommissionWhere(filters);
    const row = await this.mysql.selectOne<CommissionSummaryRow>(
      `SELECT
        COUNT(*) AS totalItems,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WM.Nbt.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS wmNtbTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WM.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS wmRetnTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."TM.Nbt.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS tmNtbTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."TM.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS tmRetnTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OM.Ntb.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS omNtbTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OM.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS omRetnTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OO.Ntb.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS ooNtbTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."OO.Retn.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS ooRetnTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WP.Funds.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS wpFundsTotal,
        SUM(CAST(REPLACE(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(ubr.raw_payload_json, '$."WP.Team.Comm"')), '0'), ',', '') AS DECIMAL(19,4))) AS wpTeamTotal
      FROM investment_records ir
      LEFT JOIN upload_batch_rows ubr ON ir.upload_batch_row_id = ubr.id
      ${where.sql}`,
      where.params,
    );
    return row ?? { totalItems: 0, wmNtbTotal: null, wmRetnTotal: null, tmNtbTotal: null, tmRetnTotal: null, omNtbTotal: null, omRetnTotal: null, ooNtbTotal: null, ooRetnTotal: null, wpFundsTotal: null, wpTeamTotal: null };
  }

  async count(filters: InvestmentFilters = {}): Promise<number> {
    const where = this.buildInvestmentWhere(filters);
    const row = await this.mysql.selectOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM investment_records ir LEFT JOIN upload_batch_rows ubr ON ir.upload_batch_row_id = ubr.id ${where.sql}`,
      where.params,
    );
    return row?.total ?? 0;
  }

  findById(id: string): Promise<InvestmentRecordRow | null> {
    return this.mysql.selectOne<InvestmentRecordRow>('SELECT * FROM investment_records WHERE id = ? LIMIT 1', [id]);
  }

  findByCustomerId(customerId: string, cursor?: string, limit = 50): Promise<InvestmentRecordRow[]> {
    if (cursor) {
      return this.mysql.selectMany<InvestmentRecordRow>(
        'SELECT * FROM investment_records WHERE customer_id = ? AND id > ? ORDER BY id ASC LIMIT ?',
        [customerId, cursor, limit],
      );
    }

    return this.mysql.selectMany<InvestmentRecordRow>(
      'SELECT * FROM investment_records WHERE customer_id = ? ORDER BY mobilisation_date DESC LIMIT ?',
      [customerId, limit],
    );
  }

  findByReference(reference: string): Promise<InvestmentRecordRow | null> {
    return this.mysql.selectOne<InvestmentRecordRow>('SELECT * FROM investment_records WHERE investment_reference = ? LIMIT 1', [reference]);
  }

  findBySourceHash(sourceHash: string): Promise<InvestmentRecordRow | null> {
    return this.mysql.selectOne<InvestmentRecordRow>('SELECT * FROM investment_records WHERE source_record_hash = ? LIMIT 1', [sourceHash]);
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(', ');
    const result = await this.mysql.execute(
      `DELETE FROM investment_records WHERE id IN (${placeholders})`,
      ids,
    );
    return result.affectedRows as number;
  }

  async deleteByCustomerIds(customerIds: string[]): Promise<number> {
    if (customerIds.length === 0) return 0;
    const placeholders = customerIds.map(() => '?').join(', ');
    const result = await this.mysql.execute(
      `DELETE FROM investment_records WHERE customer_id IN (${placeholders})`,
      customerIds,
    );
    return result.affectedRows as number;
  }
}
