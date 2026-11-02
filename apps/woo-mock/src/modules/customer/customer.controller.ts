import { Get, Res, Param, Query, UseGuards, Controller } from '@nestjs/common';

import { RecordIdPipe } from '@/core/http/request-pipes';
import { paginate, toSearchParams } from '@/core/http/paginate';
import { ConsumerKeyGuard } from '@/core/auth/consumer-key.guard';
import { StoreCatalog } from '@/modules/catalog/store-catalog.service';

import type { Response } from 'express';
import type { WooCustomer } from '@/modules/catalog/woocommerce.types';

@Controller('wp-json/wc/v3/customers')
@UseGuards(ConsumerKeyGuard)
export class CustomerController {
  constructor(private readonly catalog: StoreCatalog) {}

  @Get()
  list(
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response
  ): WooCustomer[] {
    const params = toSearchParams(query);

    return paginate(response, this.catalog.filterCustomers(params), params);
  }

  @Get(':id')
  get(@Param('id', RecordIdPipe) id: number): WooCustomer {
    return this.catalog.findCustomer(id);
  }
}
