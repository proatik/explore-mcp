import { Module } from '@nestjs/common';

import { CustomerTools } from '@/modules/customer/customer.tools';
import { CustomerService } from '@/modules/customer/customer.service';

@Module({
  providers: [CustomerTools, CustomerService],
  exports: [CustomerTools]
})
export class CustomerModule {}
