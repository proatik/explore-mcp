import { Injectable } from '@nestjs/common';

import { maskEmail, toDisplayName } from '@/core/privacy/personal-data';
import { WooCommerceClient } from '@/core/woocommerce/woocommerce-client';

import type { Page, CustomerSummary } from '@woocommerce-mcp/shared';
import type { RawCustomer } from '@/core/woocommerce/woocommerce.types';

export interface CustomerQuery {
  page: number;
  perPage: number;
  search?: string | undefined;
}

@Injectable()
export class CustomerService {
  constructor(private readonly woocommerce: WooCommerceClient) {}

  async list(
    query: CustomerQuery,
    signal?: AbortSignal
  ): Promise<Page<CustomerSummary>> {
    const response = await this.woocommerce.get<RawCustomer[]>('customers', {
      ...(signal ? { signal } : {}),
      query: { page: query.page, per_page: query.perPage, search: query.search }
    });

    return {
      items: response.data.map((customer) => this.toSummary(customer)),
      page: query.page,
      perPage: query.perPage,
      total: response.total ?? response.data.length,
      totalPages: response.totalPages ?? 1
    };
  }

  async get(
    customerId: number,
    signal?: AbortSignal
  ): Promise<CustomerSummary> {
    const response = await this.woocommerce.get<RawCustomer>(
      `customers/${customerId}`,
      signal ? { signal } : {}
    );

    return this.toSummary(response.data);
  }

  private toSummary(customer: RawCustomer): CustomerSummary {
    return {
      id: customer.id,
      name: toDisplayName(customer.first_name, customer.last_name),
      emailMasked: maskEmail(customer.email),
      city: customer.billing?.city ?? '',
      country: customer.billing?.country ?? '',
      isPayingCustomer: customer.is_paying_customer,
      dateCreated: customer.date_created
    };
  }
}
