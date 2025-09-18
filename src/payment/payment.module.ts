import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { DriverPaymentService } from './driver-payment.service';
import { CommissionService } from './commission.service';
import { InvoiceService } from './invoice.service';
import { ClickPaymeService } from './click-payme.service';

@Module({
  providers: [
    PaymentService,
    DriverPaymentService,
    CommissionService,
    InvoiceService,
    ClickPaymeService
  ],
  controllers: [PaymentController],
  exports: [
    PaymentService,
    DriverPaymentService,
    CommissionService,
    InvoiceService,
    ClickPaymeService
  ]
})
export class PaymentModule {}