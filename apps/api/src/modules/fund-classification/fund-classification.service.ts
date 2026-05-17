import { Injectable } from '@nestjs/common';

@Injectable()
export class FundClassificationService {
  classify(fundType: string): 'inflow' | 'rollover' | 'unknown' {
    if (fundType === 'inflow' || fundType === 'rollover') {
      return fundType;
    }

    return 'unknown';
  }
}
