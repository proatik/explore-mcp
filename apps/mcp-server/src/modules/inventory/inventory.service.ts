import { Injectable } from '@nestjs/common';

import { createLogger } from '@woocommerce-mcp/shared';

import { ToolError } from '@/core/mcp/tool-error';
import { ProductService } from '@/modules/product/product.service';
import {
  SCAN_MAX_PAGES,
  SCAN_PAGE_SIZE,
  MAX_STOCK_DELTA,
  MAX_STOCK_QUANTITY
} from '@/modules/inventory/inventory.constants';

import type { StockLevel } from '@woocommerce-mcp/shared';
import type { RawProduct } from '@/core/woocommerce/woocommerce.types';

export type StockOperation = 'set' | 'increment' | 'decrement';

export interface StockChange {
  operation: StockOperation;
  quantity: number;
  expectedCurrentQuantity?: number | undefined;
}

export interface StockAdjustment extends StockChange {
  productId: number;
  reason: string;
}

export interface StockState {
  manageStock: boolean;
  stockQuantity: number | null;
}

export interface AdjustedStock {
  productId: number;
  name: string;
  previousQuantity: number;
  newQuantity: number;
  stockStatus: string;
}

export interface LowStockScan {
  products: StockLevel[];
  scannedProducts: number;
}

export interface LowStockQuery {
  threshold: number;
  includeOutOfStock: boolean;
  onPage?: (page: number, totalPages: number, scanned: number) => Promise<void>;
}

@Injectable()
export class InventoryService {
  private readonly logger = createLogger('inventory');

  constructor(private readonly products: ProductService) {}

  async getLevel(productId: number, signal?: AbortSignal): Promise<StockLevel> {
    const product = await this.products.getRaw(productId, signal);

    return this.toLevel(product);
  }

  async scanLowStock(
    query: LowStockQuery,
    signal: AbortSignal
  ): Promise<LowStockScan> {
    const low: StockLevel[] = [];
    let scanned = 0;
    let totalPages = 1;

    for (let page = 1; page <= Math.min(totalPages, SCAN_MAX_PAGES); page++) {
      if (signal.aborted)
        throw new ToolError('CANCELLED', 'The stock scan was cancelled.');

      const result = await this.products.listPublishedRaw(
        page,
        SCAN_PAGE_SIZE,
        signal
      );

      totalPages = result.totalPages;
      scanned += result.items.length;
      low.push(
        ...result.items
          .filter((product) => this.isLow(product, query))
          .map((product) => this.toLevel(product))
      );

      await query.onPage?.(page, Math.min(totalPages, SCAN_MAX_PAGES), scanned);
    }

    low.sort((a, b) => (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0));

    return { products: low, scannedProducts: scanned };
  }

  async adjustStock(
    adjustment: StockAdjustment,
    signal?: AbortSignal
  ): Promise<AdjustedStock> {
    const current = await this.products.getRaw(adjustment.productId, signal);
    const newQuantity = this.computeNewQuantity(
      {
        manageStock: current.manage_stock,
        stockQuantity: current.stock_quantity
      },
      adjustment
    );

    const updated = await this.products.setStockQuantity(
      adjustment.productId,
      newQuantity,
      signal
    );

    this.logger.log('stock updated', {
      productId: adjustment.productId,
      from: current.stock_quantity,
      to: newQuantity,
      reason: adjustment.reason
    });

    return {
      productId: updated.id,
      name: updated.name,
      previousQuantity: current.stock_quantity ?? 0,
      newQuantity: updated.stock_quantity ?? newQuantity,
      stockStatus: updated.stock_status
    };
  }

  computeNewQuantity(current: StockState, change: StockChange): number {
    if (!current.manageStock || current.stockQuantity === null) {
      throw new ToolError(
        'VALIDATION_FAILED',
        'This product does not track stock quantities, so there is nothing to update.',
        {
          details: {
            hint: 'Enable "Manage stock" for the product in WooCommerce first.'
          }
        }
      );
    }

    const before = current.stockQuantity;

    if (
      change.expectedCurrentQuantity !== undefined &&
      change.expectedCurrentQuantity !== before
    ) {
      throw new ToolError(
        'CONFLICT',
        `Stock changed since it was last read: expected ${change.expectedCurrentQuantity}, found ${before}.`,
        {
          details: { expected: change.expectedCurrentQuantity, actual: before }
        }
      );
    }

    const after = this.applyOperation(before, change);

    if (after < 0) {
      throw new ToolError(
        'VALIDATION_FAILED',
        `Stock cannot go below zero (current ${before}, requested ${change.operation} ${change.quantity}).`
      );
    }

    if (after > MAX_STOCK_QUANTITY) {
      throw new ToolError(
        'VALIDATION_FAILED',
        `Stock cannot exceed ${MAX_STOCK_QUANTITY}.`
      );
    }

    if (Math.abs(after - before) > MAX_STOCK_DELTA) {
      throw new ToolError(
        'VALIDATION_FAILED',
        `A single change may move stock by at most ${MAX_STOCK_DELTA} units (requested ${after - before}).`
      );
    }

    return after;
  }

  private applyOperation(before: number, change: StockChange): number {
    switch (change.operation) {
      case 'set':
        return change.quantity;
      case 'increment':
        return before + change.quantity;
      case 'decrement':
        return before - change.quantity;
    }
  }

  private isLow(product: RawProduct, query: LowStockQuery): boolean {
    if (!product.manage_stock || product.stock_quantity === null) return false;

    const isOutOfStock = product.stock_quantity <= 0;

    return (
      product.stock_quantity <= query.threshold &&
      (query.includeOutOfStock || !isOutOfStock)
    );
  }

  private toLevel(product: RawProduct): StockLevel {
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      manageStock: product.manage_stock,
      stockQuantity: product.manage_stock ? product.stock_quantity : null,
      stockStatus: product.stock_status
    };
  }
}
