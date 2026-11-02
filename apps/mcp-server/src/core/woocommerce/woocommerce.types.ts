// only the wc/v3 fields this server reads; mappers drop everything else.
export interface RawProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  categories?: Array<{ id: number; name: string }>;
  short_description?: string;
  description?: string;
  date_modified?: string;
}

export interface RawAddress {
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  email?: string;
}

export interface RawOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  date_created: string;
  customer_id: number;
  customer_note?: string;
  billing?: RawAddress;
  payment_method_title?: string;
  line_items?: Array<{
    product_id: number;
    name: string;
    quantity: number;
    total: string;
  }>;
}

export interface RawOrderNote {
  id: number;
  author: string;
  date_created: string;
  note: string;
  customer_note: boolean;
}

export interface RawCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_created: string;
  is_paying_customer: boolean;
  billing?: RawAddress;
}

export interface RawSetting {
  id: string;
  label: string;
  value: string;
}

export interface RawSite {
  name: string;
  description: string;
  url: string;
  home?: string;
  timezone_string?: string;
}

export interface WooCommerceResponse<T> {
  data: T;
  total?: number;
  totalPages?: number;
}

export type QueryValue = string | number | boolean | undefined;

export interface WooCommerceRequest {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}
