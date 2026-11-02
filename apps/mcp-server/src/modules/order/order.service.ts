import { Injectable } from '@nestjs/common';

import { orderUri } from '@woocommerce-mcp/shared';

import { ToolError } from '@/core/mcp/tool-error';
import { ChangeEvents } from '@/core/mcp/change-events';
import { maskEmail, toDisplayName } from '@/core/privacy/personal-data';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';
import {
  COMPLETION_LIMIT,
  COMPLETION_TIMEOUT_MS
} from '@/core/mcp/mcp.constants';
import {
  RECENT_ORDER_LIMIT,
  ORDER_STATUS_TRANSITIONS
} from '@/modules/order/order.constants';

import type {
  RawOrder,
  RawOrderNote
} from '@/core/woocommerce/woocommerce.types';
import type {
  Page,
  OrderDetail,
  OrderStatus,
  OrderSummary
} from '@woocommerce-mcp/shared';

export interface OrderQuery {
  page: number;
  perPage: number;
  status?: OrderStatus[];
  customerId?: number;
  after?: string;
  before?: string;
}

export interface StatusChange {
  orderId: number;
  status: OrderStatus;
  note?: string;
  clientId: string;
}

export interface StatusChangeResult {
  order: OrderSummary;
  previousStatus: string;
  noteAdded: boolean;
}

export interface AddedNote {
  noteId: number;
  orderId: number;
  customerVisible: boolean;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly changeEvents: ChangeEvents,
    private readonly woocommerce: WooCommerceClient
  ) {}

  async list(
    query: OrderQuery,
    signal?: AbortSignal
  ): Promise<Page<OrderSummary>> {
    const response = await this.woocommerce.get<RawOrder[]>('orders', {
      ...(signal ? { signal } : {}),
      query: {
        page: query.page,
        per_page: query.perPage,
        status: query.status?.length ? query.status.join(',') : undefined,
        customer: query.customerId,
        after: query.after,
        before: query.before
      }
    });

    return {
      items: response.data.map((order) => this.toSummary(order)),
      page: query.page,
      perPage: query.perPage,
      total: response.total ?? response.data.length,
      totalPages: response.totalPages ?? 1
    };
  }

  async get(orderId: number, signal?: AbortSignal): Promise<OrderDetail> {
    const request = signal ? { signal } : {};
    const [order, notes] = await Promise.all([
      this.woocommerce.get<RawOrder>(`orders/${orderId}`, request),
      this.woocommerce.get<RawOrderNote[]>(`orders/${orderId}/notes`, request)
    ]);

    return {
      ...this.toSummary(order.data),
      customerNote: order.data.customer_note ?? '',
      notes: notes.data.map((note) => ({
        id: note.id,
        author: note.author,
        dateCreated: note.date_created,
        note: note.note,
        customerVisible: note.customer_note
      }))
    };
  }

  async matchingIds(prefix: string): Promise<string[]> {
    const page = await this.list(
      { page: 1, perPage: RECENT_ORDER_LIMIT },
      AbortSignal.timeout(COMPLETION_TIMEOUT_MS)
    );

    return page.items
      .map((order) => String(order.id))
      .filter((id) => id.startsWith(prefix))
      .slice(0, COMPLETION_LIMIT);
  }

  canTransition(from: string, to: OrderStatus): boolean {
    const allowed = ORDER_STATUS_TRANSITIONS[from as OrderStatus] ?? [];

    return allowed.includes(to);
  }

  // every status change also leaves a private audit note on the order.
  async changeStatus(
    change: StatusChange,
    signal?: AbortSignal
  ): Promise<StatusChangeResult> {
    const request = signal ? { signal } : {};
    const current = await this.woocommerce.get<RawOrder>(
      `orders/${change.orderId}`,
      request
    );
    const previousStatus = current.data.status;

    this.assertTransition(change.orderId, previousStatus, change.status);

    const updated = await this.woocommerce.put<RawOrder>(
      `orders/${change.orderId}`,
      {
        ...request,
        body: { status: change.status }
      }
    );

    const reason = change.note ? ` ${change.note}` : '';
    const auditNote = `Status changed from ${previousStatus} to ${change.status} by MCP client "${change.clientId}".${reason}`;

    await this.addNote(change.orderId, auditNote, false, signal);

    return {
      order: this.toSummary(updated.data),
      previousStatus,
      noteAdded: true
    };
  }

  async addNote(
    orderId: number,
    note: string,
    customerVisible: boolean,
    signal?: AbortSignal
  ): Promise<AddedNote> {
    const response = await this.woocommerce.post<RawOrderNote>(
      `orders/${orderId}/notes`,
      {
        ...(signal ? { signal } : {}),
        body: { note, customer_note: customerVisible }
      }
    );

    this.changeEvents.resourceUpdated(orderUri(orderId));

    return {
      noteId: response.data.id,
      orderId,
      customerVisible: response.data.customer_note
    };
  }

  private assertTransition(
    orderId: number,
    from: string,
    to: OrderStatus
  ): void {
    if (from === to)
      throw new ToolError('CONFLICT', `Order ${orderId} is already "${to}".`);

    if (this.canTransition(from, to)) return;

    throw new ToolError(
      'INVALID_TRANSITION',
      `Cannot move order ${orderId} from "${from}" to "${to}".`,
      {
        details: {
          from,
          to,
          allowed: ORDER_STATUS_TRANSITIONS[from as OrderStatus] ?? []
        }
      }
    );
  }

  private toSummary(order: RawOrder): OrderSummary {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      currency: order.currency,
      total: order.total,
      dateCreated: order.date_created,
      customer: {
        id: order.customer_id,
        name: toDisplayName(
          order.billing?.first_name,
          order.billing?.last_name
        ),
        emailMasked: maskEmail(order.billing?.email),
        city: order.billing?.city ?? '',
        country: order.billing?.country ?? ''
      },
      lineItems: (order.line_items ?? []).map((item) => ({
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        total: item.total
      })),
      paymentMethod: order.payment_method_title ?? ''
    };
  }
}
