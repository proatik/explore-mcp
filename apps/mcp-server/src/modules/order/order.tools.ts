import { z } from 'zod';
import { Injectable } from '@nestjs/common';

import {
  pageSchema,
  OrderDetailSchema,
  OrderStatusSchema,
  OrderSummarySchema
} from '@woocommerce-mcp/shared';

import { guardTool } from '@/core/mcp/guard-tool';
import { toolSuccess } from '@/core/mcp/tool-result';
import { OrderService } from '@/modules/order/order.service';
import { IdempotencyStore } from '@/core/mcp/idempotency-store';
import {
  idSchema,
  paginationShape,
  idempotencyKeySchema
} from '@/core/mcp/tool-input';

import type { McpServer } from '@modelcontextprotocol/server';

const GetOrderInputSchema = z.object({ orderId: idSchema('order') });

const ListOrdersInputSchema = z.object({
  ...paginationShape,
  status: z
    .array(OrderStatusSchema)
    .max(7)
    .optional()
    .describe('Only orders in one of these statuses'),
  customerId: idSchema('customer').optional(),
  after: z.iso
    .datetime({ local: true })
    .optional()
    .describe('Only orders created after this ISO 8601 date-time'),
  before: z.iso
    .datetime({ local: true })
    .optional()
    .describe('Only orders created before this ISO 8601 date-time')
});

const AddOrderNoteInputSchema = z.object({
  orderId: idSchema('order'),
  note: z.string().trim().min(1).max(1000),
  customerVisible: z
    .boolean()
    .default(false)
    .describe(
      'When true, WooCommerce emails the note to the customer. Keep false for internal notes.'
    ),
  idempotencyKey: idempotencyKeySchema
});

const UpdateOrderStatusInputSchema = z.object({
  orderId: idSchema('order'),
  status: OrderStatusSchema.describe('The new status'),
  note: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .describe('Private note recorded on the order explaining the change'),
  idempotencyKey: idempotencyKeySchema
});

type GetOrderInput = z.infer<typeof GetOrderInputSchema>;

type ListOrdersInput = z.infer<typeof ListOrdersInputSchema>;

type AddOrderNoteInput = z.infer<typeof AddOrderNoteInputSchema>;

type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInputSchema>;

@Injectable()
export class OrderTools {
  constructor(
    private readonly orders: OrderService,
    private readonly idempotency: IdempotencyStore
  ) {}

  register(server: McpServer): void {
    server.registerTool(
      'list_orders',
      {
        title: 'List orders',
        description:
          'List orders, newest first, with optional status, customer and date filters. Customer contact details are masked.',
        inputSchema: ListOrdersInputSchema,
        outputSchema: pageSchema(OrderSummarySchema),
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        { name: 'list_orders', scope: 'orders:read' },
        async (args: ListOrdersInput, { signal }) => {
          const page = await this.orders.list(args, signal);

          return toolSuccess(
            page,
            `Page ${page.page} of ${page.totalPages} (${page.total} orders in total).`
          );
        }
      )
    );

    server.registerTool(
      'get_order',
      {
        title: 'Get order',
        description:
          'Get one order by ID, including line items, the customer note and the order notes history.',
        inputSchema: GetOrderInputSchema,
        outputSchema: OrderDetailSchema,
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        { name: 'get_order', scope: 'orders:read', subject: 'order' },
        async ({ orderId }: GetOrderInput, { signal }) => {
          const order = await this.orders.get(orderId, signal);

          return toolSuccess(order);
        }
      )
    );

    server.registerTool(
      'update_order_status',
      {
        title: 'Update order status',
        description:
          'Change the status of an order. Only safe transitions are allowed: completed, cancelled and refunded orders are final, and refunds cannot be made through this tool. Requires human approval in well-behaved clients.',
        inputSchema: UpdateOrderStatusInputSchema,
        outputSchema: z.object({
          order: OrderSummarySchema,
          previousStatus: z.string(),
          noteAdded: z.boolean()
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      guardTool(
        {
          name: 'update_order_status',
          scope: 'orders:write',
          subject: 'order'
        },
        async (args: UpdateOrderStatusInput, { auth, signal }) =>
          await this.idempotency.run(
            {
              clientId: auth.clientId,
              tool: 'update_order_status',
              key: args.idempotencyKey
            },
            args,
            async () => {
              const result = await this.orders.changeStatus(
                { ...args, clientId: auth.clientId },
                signal
              );

              return toolSuccess(
                { ...result },
                `Order ${args.orderId} moved from "${result.previousStatus}" to "${args.status}".`
              );
            }
          )
      )
    );

    server.registerTool(
      'add_order_note',
      {
        title: 'Add order note',
        description:
          'Add a note to an order. Private by default; a customer-visible note is emailed to the customer.',
        inputSchema: AddOrderNoteInputSchema,
        outputSchema: z.object({
          noteId: z.number().int(),
          orderId: z.number().int(),
          customerVisible: z.boolean()
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true
        }
      },
      guardTool(
        { name: 'add_order_note', scope: 'orders:write', subject: 'order' },
        async (args: AddOrderNoteInput, { auth, signal }) =>
          await this.idempotency.run(
            {
              clientId: auth.clientId,
              tool: 'add_order_note',
              key: args.idempotencyKey
            },
            args,
            async () => {
              const note = await this.orders.addNote(
                args.orderId,
                args.note,
                args.customerVisible,
                signal
              );
              const summary = note.customerVisible
                ? 'Note added and emailed to the customer.'
                : 'Private note added.';

              return toolSuccess({ ...note }, summary);
            }
          )
      )
    );
  }
}
