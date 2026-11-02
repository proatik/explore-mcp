import {
  Get,
  Put,
  Res,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Controller
} from '@nestjs/common';

import { paginate, toSearchParams } from '@/core/http/paginate';
import { ConsumerKeyGuard } from '@/core/auth/consumer-key.guard';
import { ZodBodyPipe, RecordIdPipe } from '@/core/http/request-pipes';
import { StoreCatalog } from '@/modules/catalog/store-catalog.service';
import { ProductUpdateSchema } from '@/modules/catalog/mock-request.schema';

import type { Response } from 'express';
import type { WooProduct } from '@/modules/catalog/woocommerce.types';
import type { ProductUpdate } from '@/modules/catalog/mock-request.schema';

@Controller('wp-json/wc/v3/products')
@UseGuards(ConsumerKeyGuard)
export class ProductController {
  constructor(private readonly catalog: StoreCatalog) {}

  @Get()
  list(
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response
  ): WooProduct[] {
    const params = toSearchParams(query);

    return paginate(response, this.catalog.filterProducts(params), params);
  }

  @Get(':id')
  get(@Param('id', RecordIdPipe) id: number): WooProduct {
    return this.catalog.findProduct(id);
  }

  @Put(':id')
  update(
    @Param('id', RecordIdPipe) id: number,
    @Body(new ZodBodyPipe(ProductUpdateSchema)) update: ProductUpdate
  ): WooProduct {
    return this.catalog.updateProduct(id, update);
  }

  @Delete(':id')
  remove(@Param('id', RecordIdPipe) id: number): WooProduct {
    return this.catalog.deleteProduct(id);
  }
}
