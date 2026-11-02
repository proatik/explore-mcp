import {
  Get,
  Put,
  Res,
  Body,
  Post,
  Param,
  Query,
  UseGuards,
  Controller
} from '@nestjs/common';

import { paginate, toSearchParams } from '@/core/http/paginate';
import { ConsumerKeyGuard } from '@/core/auth/consumer-key.guard';
import { ZodBodyPipe, RecordIdPipe } from '@/core/http/request-pipes';
import { StoreCatalog } from '@/modules/catalog/store-catalog.service';
import {
  OrderUpdateSchema,
  OrderNoteCreateSchema
} from '@/modules/catalog/mock-request.schema';

import type { Response } from 'express';
import type {
  WooOrder,
  WooOrderNote
} from '@/modules/catalog/woocommerce.types';
import type {
  OrderUpdate,
  OrderNoteCreate
} from '@/modules/catalog/mock-request.schema';

@Controller('wp-json/wc/v3/orders')
@UseGuards(ConsumerKeyGuard)
export class OrderController {
  constructor(private readonly catalog: StoreCatalog) {}

  @Get()
  list(
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response
  ): WooOrder[] {
    const params = toSearchParams(query);

    return paginate(response, this.catalog.filterOrders(params), params);
  }

  @Get(':id')
  get(@Param('id', RecordIdPipe) id: number): WooOrder {
    return this.catalog.findOrder(id);
  }

  @Put(':id')
  update(
    @Param('id', RecordIdPipe) id: number,
    @Body(new ZodBodyPipe(OrderUpdateSchema)) update: OrderUpdate
  ): WooOrder {
    return this.catalog.updateOrder(id, update);
  }

  @Get(':id/notes')
  listNotes(@Param('id', RecordIdPipe) id: number): WooOrderNote[] {
    return this.catalog.orderNotes(id);
  }

  // woocommerce answers 201, since the note is a new addressable record.
  @Post(':id/notes')
  addNote(
    @Param('id', RecordIdPipe) id: number,
    @Body(new ZodBodyPipe(OrderNoteCreateSchema)) note: OrderNoteCreate
  ): WooOrderNote {
    return this.catalog.addOrderNote(id, note);
  }
}
