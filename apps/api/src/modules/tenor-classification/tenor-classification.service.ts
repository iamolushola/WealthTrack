import { Injectable } from '@nestjs/common';

@Injectable()
export class TenorClassificationService {
  classify(days: number): string {
    if (days >= 30 && days <= 120) {
      return 'short_term';
    }

    if (days >= 150 && days <= 210) {
      return 'mid_short_term';
    }

    if (days >= 240 && days <= 360) {
      return 'medium_term';
    }

    if (days >= 390 && days <= 480) {
      return 'long_term';
    }

    return 'unclassified';
  }
}
