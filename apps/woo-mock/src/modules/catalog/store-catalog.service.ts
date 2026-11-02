import { Injectable } from '@nestjs/common';

import { seed } from '@/modules/catalog/seed-data';
import { MockHttpError } from '@/core/http/mock-http-error';

import type {
  OrderUpdate,
  ProductUpdate,
  OrderNoteCreate
} from '@/modules/catalog/mock-request.schema';
import type {
  SeedData,
  WooOrder,
  WooProduct,
  WooCustomer,
  WooOrderNote
} from '@/modules/catalog/woocommerce.types';

@Injectable()
export class StoreCatalog {
  private records: SeedData = structuredClone(seed);

  get data(): SeedData {
    return this.records;
  }

  reset(): void {
    this.records = structuredClone(seed);
  }

  findProduct(id: number): WooProduct {
    return this.findById(
      this.records.products,
      id,
      'woocommerce_rest_product_invalid_id'
    );
  }

  findOrder(id: number): WooOrder {
    return this.findById(
      this.records.orders,
      id,
      'woocommerce_rest_shop_order_invalid_id'
    );
  }

  findCustomer(id: number): WooCustomer {
    return this.findById(
      this.records.customers,
      id,
      'woocommerce_rest_invalid_id'
    );
  }

  updateProduct(id: number, update: ProductUpdate): WooProduct {
    const product = this.findProduct(id);

    Object.assign(product, update);

    if (update.stock_quantity !== undefined && product.manage_stock) {
      product.stock_status = this.stockStatusFor(
        product,
        update.stock_quantity
      );
    }

    product.price = product.sale_price || product.regular_price;
    product.date_modified = this.now();

    return product;
  }

  deleteProduct(id: number): WooProduct {
    const product = this.findProduct(id);

    this.records.products = this.records.products.filter(
      (item) => item.id !== id
    );

    return product;
  }

  updateOrder(id: number, update: OrderUpdate): WooOrder {
    const order = this.findOrder(id);

    if (update.status) order.status = update.status;

    order.date_modified = this.now();

    return order;
  }

  orderNotes(id: number): WooOrderNote[] {
    this.findOrder(id);

    return this.records.orderNotes[id] ?? [];
  }

  addOrderNote(id: number, input: OrderNoteCreate): WooOrderNote {
    this.findOrder(id);

    const notes = (this.records.orderNotes[id] ??= []);
    const note: WooOrderNote = {
      id: notes.length + 1,
      author: 'WooCommerce',
      date_created: this.now(),
      note: input.note,
      customer_note: input.customer_note ?? false
    };

    notes.push(note);

    return note;
  }

  filterProducts(query: URLSearchParams): WooProduct[] {
    const search = query.get('search')?.toLowerCase();
    const stockStatus = query.get('stock_status');
    const status = query.get('status') ?? 'any';
    const category = query.get('category');

    return this.records.products.filter(
      (product) =>
        (!search ||
          `${product.name} ${product.short_description} ${product.sku}`
            .toLowerCase()
            .includes(search)) &&
        (!stockStatus || product.stock_status === stockStatus) &&
        (status === 'any' || product.status === status) &&
        (!category ||
          product.categories.some((item) => String(item.id) === category))
    );
  }

  filterOrders(query: URLSearchParams): WooOrder[] {
    const statuses = query
      .get('status')
      ?.split(',')
      .filter((status) => status !== 'any');
    const customer = query.get('customer');
    const after = query.get('after')?.slice(0, 19);
    const before = query.get('before')?.slice(0, 19);

    return this.records.orders
      .filter(
        (order) =>
          (!statuses?.length || statuses.includes(order.status)) &&
          (!customer || String(order.customer_id) === customer) &&
          (!after || order.date_created > after) &&
          (!before || order.date_created < before)
      )
      .sort((a, b) => b.date_created.localeCompare(a.date_created));
  }

  filterCustomers(query: URLSearchParams): WooCustomer[] {
    const search = query.get('search')?.toLowerCase();

    return this.records.customers.filter(
      (customer) =>
        !search ||
        `${customer.first_name} ${customer.last_name} ${customer.email}`
          .toLowerCase()
          .includes(search)
    );
  }

  private stockStatusFor(
    product: WooProduct,
    quantity: number
  ): WooProduct['stock_status'] {
    if (quantity > 0) return 'instock';

    return product.stock_status === 'onbackorder'
      ? 'onbackorder'
      : 'outofstock';
  }

  private findById<T extends { id: number }>(
    items: T[],
    id: number,
    code: string
  ): T {
    const item = items.find((entry) => entry.id === id);

    if (!item) throw new MockHttpError(404, code, 'Invalid ID.');

    return item;
  }

  private now(): string {
    return new Date().toISOString().slice(0, 19);
  }
}
