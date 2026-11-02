import type {
  WooOrder,
  WooAddress,
  WooProduct,
  WooCustomer,
  WooCategoryRef
} from '@/modules/catalog/woocommerce.types';

export interface ProductSeed {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: number | null;
  category: WooCategoryRef;
  summary: string;
  overrides?: Partial<WooProduct>;
}

export interface OrderSeed {
  id: number;
  status: WooOrder['status'];
  customer: WooCustomer;
  created: string;
  items: Array<[productId: number, quantity: number]>;
  overrides?: Partial<WooOrder>;
}

export const SITE_URL = 'https://demo.harbourandpine.example';

export function toCategory(id: number, name: string): WooCategoryRef {
  return { id, name, slug: name.toLowerCase().replace(/\s+/g, '-') };
}

export function toAddress(
  firstName: string,
  lastName: string,
  city: string,
  country: string
): WooAddress {
  return {
    first_name: firstName,
    last_name: lastName,
    company: '',
    address_1: '12 Example Street',
    address_2: '',
    city,
    state: '',
    postcode: '00000',
    country
  };
}

export function toCustomer(
  id: number,
  firstName: string,
  lastName: string,
  username: string,
  city: string,
  country: string,
  created: string,
  isPayingCustomer: boolean
): WooCustomer {
  const email = `${firstName}.${lastName}@example.com`.toLowerCase();
  const address = toAddress(firstName, lastName, city, country);

  return {
    id,
    email,
    first_name: firstName,
    last_name: lastName,
    username,
    date_created: created,
    is_paying_customer: isPayingCustomer,
    billing: { ...address, email, phone: '+00 000 000 000' },
    shipping: address
  };
}

export function toProduct(seed: ProductSeed): WooProduct {
  const slug = seed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const isInStock = seed.stock === null || seed.stock > 0;

  return {
    id: seed.id,
    name: seed.name,
    slug,
    permalink: `${SITE_URL}/product/${slug}/`,
    type: 'simple',
    status: 'publish',
    sku: seed.sku,
    price: seed.price,
    regular_price: seed.price,
    sale_price: '',
    manage_stock: seed.stock !== null,
    stock_quantity: seed.stock,
    stock_status: isInStock ? 'instock' : 'outofstock',
    categories: [seed.category],
    short_description: seed.summary,
    description: `<p>${seed.summary}</p>`,
    date_created: '2026-03-02T10:00:00',
    date_modified: '2026-10-20T09:30:00',
    ...seed.overrides
  };
}

export function toOrder(seed: OrderSeed, products: WooProduct[]): WooOrder {
  const lineItems = seed.items.map(([productId, quantity], index) => {
    const product = products.find((item) => item.id === productId);

    if (!product)
      throw new Error(
        `Seed order ${seed.id} references unknown product ${productId}.`
      );

    return {
      id: seed.id * 10 + index,
      product_id: productId,
      name: product.name,
      quantity,
      total: (Number(product.price) * quantity).toFixed(2)
    };
  });

  return {
    id: seed.id,
    number: String(seed.id),
    status: seed.status,
    currency: 'EUR',
    total: lineItems
      .reduce((sum, item) => sum + Number(item.total), 0)
      .toFixed(2),
    date_created: seed.created,
    date_modified: seed.created,
    customer_id: seed.customer.id,
    customer_note: '',
    billing: seed.customer.billing,
    shipping: seed.customer.shipping,
    payment_method_title: 'Credit card',
    line_items: lineItems,
    ...seed.overrides
  };
}
