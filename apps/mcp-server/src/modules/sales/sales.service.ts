import { Injectable } from '@nestjs/common';

import { OrderService } from '@/modules/order/order.service';
import {
  REVENUE_STATUSES,
  MAX_SUMMARY_PAGES,
  SUMMARY_PAGE_SIZE,
  TOP_PRODUCT_COUNT
} from '@/modules/sales/sales.constants';

import type { OrderSummary } from '@woocommerce-mcp/shared';

export interface TopProduct {
  productId: number;
  name: string;
  quantity: number;
  revenue: string;
}

export interface SalesSummary {
  periodDays: number;
  currency: string;
  orderCount: number;
  revenueOrderCount: number;
  revenue: string;
  averageOrderValue: string;
  ordersByStatus: Record<string, number>;
  topProducts: TopProduct[];
}

interface ProductTotals {
  name: string;
  quantity: number;
  revenue: number;
}

const DAY_MS = 86_400_000;

@Injectable()
export class SalesService {
  constructor(private readonly orders: OrderService) {}

  async summarizeRecent(
    periodDays: number,
    signal?: AbortSignal
  ): Promise<SalesSummary> {
    const after = new Date(Date.now() - periodDays * DAY_MS)
      .toISOString()
      .slice(0, 19);
    const orders = await this.collectOrders(after, signal);

    return this.summarize(orders, periodDays);
  }

  summarize(orders: OrderSummary[], periodDays: number): SalesSummary {
    const revenueOrders = orders.filter((order) =>
      REVENUE_STATUSES.includes(order.status)
    );
    const revenue = revenueOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );
    const ordersByStatus: Record<string, number> = {};

    for (const order of orders)
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;

    return {
      periodDays,
      currency: orders[0]?.currency ?? '',
      orderCount: orders.length,
      revenueOrderCount: revenueOrders.length,
      revenue: revenue.toFixed(2),
      averageOrderValue: revenueOrders.length
        ? (revenue / revenueOrders.length).toFixed(2)
        : '0.00',
      ordersByStatus,
      topProducts: this.topProducts(revenueOrders)
    };
  }

  private async collectOrders(
    after: string,
    signal?: AbortSignal
  ): Promise<OrderSummary[]> {
    const orders: OrderSummary[] = [];

    for (let page = 1; page <= MAX_SUMMARY_PAGES; page++) {
      const result = await this.orders.list(
        { page, perPage: SUMMARY_PAGE_SIZE, after },
        signal
      );

      orders.push(...result.items);

      if (page >= result.totalPages) break;
    }

    return orders;
  }

  private topProducts(orders: OrderSummary[]): TopProduct[] {
    const totals = new Map<number, ProductTotals>();

    for (const item of orders.flatMap((order) => order.lineItems)) {
      const entry = totals.get(item.productId) ?? {
        name: item.name,
        quantity: 0,
        revenue: 0
      };

      entry.quantity += item.quantity;
      entry.revenue += Number(item.total);
      totals.set(item.productId, entry);
    }

    return [...totals.entries()]
      .map(([productId, entry]) => ({
        productId,
        name: entry.name,
        quantity: entry.quantity,
        revenue: entry.revenue.toFixed(2)
      }))
      .sort(
        (a, b) =>
          b.quantity - a.quantity || Number(b.revenue) - Number(a.revenue)
      )
      .slice(0, TOP_PRODUCT_COUNT);
  }
}
