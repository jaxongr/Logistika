import { Module } from '@nestjs/common';
import { DriverPaymentsController } from './driver-payments.controller';
import { DriverPaymentsService } from './driver-payments.service';

@Module({
    controllers: [DriverPaymentsController],
    providers: [DriverPaymentsService],
    exports: [DriverPaymentsService]
})
export class DriverPaymentsModule {}