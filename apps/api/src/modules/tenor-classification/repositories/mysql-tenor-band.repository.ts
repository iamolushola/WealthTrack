import { Injectable } from '@nestjs/common';
import { TenorBandRow } from '@wealthtrack/shared-types';
import { MysqlService } from '../../../persistence/mysql/mysql.service';
import { TenorBandRepository } from '../interfaces/tenor-classification.repositories';

@Injectable()
export class MysqlTenorBandRepository implements TenorBandRepository {
  constructor(private readonly mysql: MysqlService) {}

  listActive(): Promise<TenorBandRow[]> {
    return this.mysql.selectMany<TenorBandRow>('SELECT * FROM tenor_bands WHERE status = ? ORDER BY display_order ASC', ['active']);
  }
}
