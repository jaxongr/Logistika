import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  async calculateCommission(orderData: any): Promise<number> {
    const baseRate = 10; // 10% default
    return orderData.amount * (baseRate / 100);
  }

  async getCommissionHistory(): Promise<any[]> {
    return [];
  }
}