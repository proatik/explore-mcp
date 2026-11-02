import {
  toOrder,
  SITE_URL,
  toProduct,
  toCategory,
  toCustomer
} from '@/modules/catalog/seed-builders';

import type { OrderSeed } from '@/modules/catalog/seed-builders';
import type {
  SeedData,
  WooOrder,
  WooProduct,
  WooCustomer
} from '@/modules/catalog/woocommerce.types';

const CATEGORIES = {
  kitchen: toCategory(11, 'Kitchen'),
  textiles: toCategory(12, 'Textiles'),
  lighting: toCategory(13, 'Lighting'),
  stationery: toCategory(14, 'Stationery')
};

const customers: WooCustomer[] = [
  toCustomer(
    7,
    'Maya',
    'Lindqvist',
    'maya.l',
    'Gothenburg',
    'SE',
    '2026-04-11T14:22:00',
    true
  ),
  toCustomer(
    8,
    'Tomas',
    'Okafor',
    'tokafor',
    'Leeds',
    'GB',
    '2026-05-03T08:05:00',
    true
  ),
  toCustomer(
    9,
    'Aiko',
    'Tanaka',
    'aiko',
    'Osaka',
    'JP',
    '2026-06-19T19:40:00',
    false
  ),
  toCustomer(
    10,
    'Rafael',
    'Costa',
    'rcosta',
    'Porto',
    'PT',
    '2026-08-27T11:12:00',
    true
  )
];

const products: WooProduct[] = [
  toProduct({
    id: 101,
    name: 'Stoneware Pour-Over Set',
    sku: 'KIT-POUR-01',
    price: '48.00',
    stock: 14,
    category: CATEGORIES.kitchen,
    summary: 'Hand-glazed stoneware dripper with matching carafe.'
  }),
  toProduct({
    id: 102,
    name: 'Walnut Serving Board',
    sku: 'KIT-BOARD-02',
    price: '36.00',
    stock: 3,
    category: CATEGORIES.kitchen,
    summary: 'Oiled walnut board with a juice groove.'
  }),
  toProduct({
    id: 103,
    name: 'Enamel Camp Mugs (Set of 2)',
    sku: 'KIT-MUG-03',
    price: '22.00',
    stock: 0,
    category: CATEGORIES.kitchen,
    summary: 'Speckled enamel mugs, dishwasher safe.'
  }),
  toProduct({
    id: 104,
    name: 'Linen Tea Towels (Set of 3)',
    sku: 'TEX-TOWEL-01',
    price: '18.00',
    stock: 41,
    category: CATEGORIES.textiles,
    summary: 'Stonewashed linen towels in three earth tones.',
    overrides: { sale_price: '15.00', price: '15.00' }
  }),
  toProduct({
    id: 105,
    name: 'Merino Throw Blanket',
    sku: 'TEX-THROW-02',
    price: '129.00',
    stock: 4,
    category: CATEGORIES.textiles,
    summary: 'Lightweight merino throw woven in Portugal.'
  }),
  toProduct({
    id: 106,
    name: 'Waffle Cotton Bath Towel',
    sku: 'TEX-BATH-03',
    price: '34.00',
    stock: 27,
    category: CATEGORIES.textiles,
    summary: 'Quick-drying waffle weave cotton.'
  }),
  toProduct({
    id: 107,
    name: 'Brass Task Lamp',
    sku: 'LGT-LAMP-01',
    price: '189.00',
    stock: 2,
    category: CATEGORIES.lighting,
    summary: 'Adjustable brass desk lamp with a linen shade.'
  }),
  toProduct({
    id: 108,
    name: 'Paper Pendant Shade',
    sku: 'LGT-SHADE-02',
    price: '64.00',
    stock: 9,
    category: CATEGORIES.lighting,
    summary: 'Hand-folded paper pendant shade, 45 cm.'
  }),
  toProduct({
    id: 109,
    name: 'Beeswax Pillar Candles',
    sku: 'LGT-CANDLE-03',
    price: '24.00',
    stock: 1,
    category: CATEGORIES.lighting,
    summary: 'Pure beeswax pillars, approx. 40 hour burn.'
  }),
  toProduct({
    id: 110,
    name: 'Dot Grid Notebook A5',
    sku: 'STA-NOTE-01',
    price: '16.00',
    stock: 120,
    category: CATEGORIES.stationery,
    summary: 'Lay-flat notebook with 160 gsm paper.'
  }),
  toProduct({
    id: 111,
    name: 'Brass Fountain Pen',
    sku: 'STA-PEN-02',
    price: '58.00',
    stock: 6,
    category: CATEGORIES.stationery,
    summary: 'Solid brass pen with a steel nib.'
  }),
  toProduct({
    id: 112,
    name: 'Gift Card',
    sku: 'STA-GIFT-03',
    price: '50.00',
    stock: null,
    category: CATEGORIES.stationery,
    summary: 'Digital gift card, delivered by email.'
  }),
  toProduct({
    id: 113,
    name: 'Ceramic Pasta Bowls (Set of 4)',
    sku: 'KIT-BOWL-04',
    price: '72.00',
    stock: 0,
    category: CATEGORIES.kitchen,
    summary: 'Wide-rimmed bowls, coming back in spring.',
    overrides: { stock_status: 'onbackorder' }
  }),
  toProduct({
    id: 114,
    name: 'Hemp Market Tote',
    sku: 'TEX-TOTE-04',
    price: '28.00',
    stock: 18,
    category: CATEGORIES.textiles,
    summary: 'Durable hemp tote with a leather handle.',
    overrides: { status: 'draft' }
  })
];

const [maya, tomas, aiko, rafael] = customers as [
  WooCustomer,
  WooCustomer,
  WooCustomer,
  WooCustomer
];

const order = (seed: OrderSeed): WooOrder => toOrder(seed, products);

const orders: WooOrder[] = [
  order({
    id: 5001,
    status: 'completed',
    customer: maya,
    created: '2026-10-02T09:15:00',
    items: [
      [101, 1],
      [104, 2]
    ]
  }),
  order({
    id: 5002,
    status: 'completed',
    customer: tomas,
    created: '2026-10-09T16:40:00',
    items: [[107, 1]]
  }),
  order({
    id: 5003,
    status: 'processing',
    customer: rafael,
    created: '2026-10-24T12:05:00',
    items: [
      [105, 1],
      [109, 2]
    ]
  }),
  order({
    id: 5004,
    status: 'on-hold',
    customer: aiko,
    created: '2026-10-27T20:30:00',
    items: [
      [110, 3],
      [111, 1]
    ],
    overrides: {
      customer_note: 'Could you wrap the pen as a gift?',
      payment_method_title: 'Bank transfer'
    }
  }),
  order({
    id: 5005,
    status: 'processing',
    customer: maya,
    created: '2026-10-29T07:55:00',
    items: [
      [102, 1],
      [106, 2]
    ]
  }),
  order({
    id: 5006,
    status: 'pending',
    customer: tomas,
    created: '2026-10-31T22:10:00',
    items: [[108, 1]],
    overrides: { payment_method_title: 'PayPal' }
  }),
  order({
    id: 5007,
    status: 'cancelled',
    customer: aiko,
    created: '2026-10-15T10:00:00',
    items: [[103, 2]]
  }),
  order({
    id: 5008,
    status: 'refunded',
    customer: rafael,
    created: '2026-09-21T13:45:00',
    items: [[112, 1]]
  })
];

export const seed: SeedData = {
  site: {
    name: 'Harbour & Pine',
    description: 'Small-batch homeware from independent makers',
    url: SITE_URL,
    home: SITE_URL,
    timezone_string: 'Europe/Lisbon'
  },
  settings: [
    {
      id: 'woocommerce_store_address',
      label: 'Address line 1',
      value: '4 Rua das Flores'
    },
    { id: 'woocommerce_store_city', label: 'City', value: 'Porto' },
    {
      id: 'woocommerce_default_country',
      label: 'Country / State',
      value: 'PT'
    },
    {
      id: 'woocommerce_store_postcode',
      label: 'Postcode / ZIP',
      value: '4050-262'
    },
    { id: 'woocommerce_currency', label: 'Currency', value: 'EUR' },
    {
      id: 'woocommerce_price_num_decimals',
      label: 'Number of decimals',
      value: '2'
    },
    { id: 'woocommerce_calc_taxes', label: 'Enable taxes', value: 'yes' },
    {
      id: 'woocommerce_specific_allowed_countries',
      label: 'Sell to specific countries',
      value: ''
    }
  ],
  products,
  orders,
  orderNotes: {
    5004: [
      {
        id: 1,
        author: 'system',
        date_created: '2026-10-27T20:31:00',
        note: 'Awaiting bank transfer payment. Order status changed from Pending payment to On hold.',
        customer_note: false
      }
    ]
  },
  customers
};
