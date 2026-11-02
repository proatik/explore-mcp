// field names follow wc/v3, so the server code works on a real store too.

export interface WooCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  status: 'publish' | 'draft' | 'pending' | 'private';
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  categories: WooCategoryRef[];
  short_description: string;
  description: string;
  date_created: string;
  date_modified: string;
}

export interface WooAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface WooLineItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  total: string;
}

export interface WooOrder {
  id: number;
  number: string;
  status:
    | 'pending'
    | 'processing'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'failed';
  currency: string;
  total: string;
  date_created: string;
  date_modified: string;
  customer_id: number;
  customer_note: string;
  billing: WooAddress;
  shipping: WooAddress;
  payment_method_title: string;
  line_items: WooLineItem[];
}

export interface WooOrderNote {
  id: number;
  author: string;
  date_created: string;
  note: string;
  customer_note: boolean;
}

export interface WooCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  date_created: string;
  is_paying_customer: boolean;
  billing: WooAddress;
  shipping: WooAddress;
}

export interface WooSetting {
  id: string;
  label: string;
  value: string;
}

export interface WooSite {
  name: string;
  description: string;
  url: string;
  home: string;
  timezone_string: string;
}

export interface SeedData {
  site: WooSite;
  settings: WooSetting[];
  products: WooProduct[];
  orders: WooOrder[];
  orderNotes: Record<number, WooOrderNote[]>;
  customers: WooCustomer[];
}
