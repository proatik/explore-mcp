import { Injectable } from '@nestjs/common';

import { productUri } from '@woocommerce-mcp/shared';

import { ToolError } from '@/core/mcp/tool-error';
import { ChangeEvents } from '@/core/mcp/change-events';
import { CATALOG_LIMIT } from '@/modules/product/product.constants';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';
import {
  COMPLETION_LIMIT,
  COMPLETION_TIMEOUT_MS
} from '@/core/mcp/mcp.constants';

import type { RawProduct } from '@/core/woocommerce/woocommerce.types';
import type {
  Page,
  ProductDetail,
  ProductSummary
} from '@woocommerce-mcp/shared';

export interface ProductQuery {
  page: number;
  perPage: number;
  search?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private' | 'any';
  stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
  category?: number;
}

export interface RawProductPage {
  items: RawProduct[];
  totalPages: number;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly changeEvents: ChangeEvents,
    private readonly woocommerce: WooCommerceClient
  ) {}

  async list(
    query: ProductQuery,
    signal?: AbortSignal
  ): Promise<Page<ProductSummary>> {
    const response = await this.woocommerce.get<RawProduct[]>('products', {
      ...(signal ? { signal } : {}),
      query: {
        page: query.page,
        per_page: query.perPage,
        search: query.search,
        status: query.status ?? 'publish',
        stock_status: query.stockStatus,
        category: query.category
      }
    });

    return {
      items: response.data.map((product) => this.toSummary(product)),
      page: query.page,
      perPage: query.perPage,
      total: response.total ?? response.data.length,
      totalPages: response.totalPages ?? 1
    };
  }

  async listPublishedRaw(
    page: number,
    perPage: number,
    signal?: AbortSignal
  ): Promise<RawProductPage> {
    const response = await this.woocommerce.get<RawProduct[]>('products', {
      ...(signal ? { signal } : {}),
      query: { page, per_page: perPage, status: 'publish' }
    });

    return { items: response.data, totalPages: response.totalPages ?? 1 };
  }

  async getRaw(productId: number, signal?: AbortSignal): Promise<RawProduct> {
    const response = await this.woocommerce.get<RawProduct>(
      `products/${productId}`,
      signal ? { signal } : {}
    );

    return response.data;
  }

  async get(productId: number, signal?: AbortSignal): Promise<ProductDetail> {
    const product = await this.getRaw(productId, signal);

    return this.toDetail(product);
  }

  async matchingIds(prefix: string): Promise<string[]> {
    const page = await this.list(
      { page: 1, perPage: CATALOG_LIMIT },
      AbortSignal.timeout(COMPLETION_TIMEOUT_MS)
    );

    return page.items
      .map((product) => String(product.id))
      .filter((id) => id.startsWith(prefix))
      .slice(0, COMPLETION_LIMIT);
  }

  async setStockQuantity(
    productId: number,
    quantity: number,
    signal?: AbortSignal
  ): Promise<RawProduct> {
    const response = await this.woocommerce.put<RawProduct>(
      `products/${productId}`,
      {
        ...(signal ? { signal } : {}),
        body: { stock_quantity: quantity }
      }
    );

    this.changeEvents.resourceUpdated(productUri(productId));

    return response.data;
  }

  // the SKU check guards against deleting a product the model misidentified.
  async delete(
    productId: number,
    confirmSku: string,
    permanent: boolean,
    signal?: AbortSignal
  ): Promise<ProductSummary> {
    const current = await this.getRaw(productId, signal);

    if (current.sku !== confirmSku) {
      throw new ToolError(
        'VALIDATION_FAILED',
        'confirmSku does not match the product. Nothing was deleted.',
        {
          details: { productId }
        }
      );
    }

    const response = await this.woocommerce.delete<RawProduct>(
      `products/${productId}`,
      {
        ...(signal ? { signal } : {}),
        query: { force: permanent }
      }
    );

    this.changeEvents.resourceUpdated(productUri(productId));

    return this.toSummary(response.data);
  }

  private toSummary(product: RawProduct): ProductSummary {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      type: product.type,
      status: product.status,
      price: product.price,
      regularPrice: product.regular_price,
      salePrice: product.sale_price,
      stockStatus: product.stock_status,
      manageStock: product.manage_stock,
      stockQuantity: product.manage_stock ? product.stock_quantity : null,
      categories: (product.categories ?? []).map((category) => category.name),
      permalink: product.permalink
    };
  }

  private toDetail(product: RawProduct): ProductDetail {
    return {
      ...this.toSummary(product),
      shortDescription: this.htmlToText(product.short_description ?? ''),
      description: this.htmlToText(product.description ?? ''),
      dateModified: product.date_modified ?? ''
    };
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
