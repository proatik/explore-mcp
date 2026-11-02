import { z } from 'zod';
import { Injectable } from '@nestjs/common';

import { pageSchema, CustomerSummarySchema } from '@woocommerce-mcp/shared';

import { guardTool } from '@/core/mcp/guard-tool';
import { toolSuccess } from '@/core/mcp/tool-result';
import { idSchema, paginationShape } from '@/core/mcp/tool-input';
import { CustomerService } from '@/modules/customer/customer.service';

import type { McpServer } from '@modelcontextprotocol/server';

const GetCustomerInputSchema = z.object({ customerId: idSchema('customer') });

const ListCustomersInputSchema = z.object({
  ...paginationShape,
  search: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .describe('Match against customer name or email')
});

type GetCustomerInput = z.infer<typeof GetCustomerInputSchema>;

type ListCustomersInput = z.infer<typeof ListCustomersInputSchema>;

@Injectable()
export class CustomerTools {
  constructor(private readonly customers: CustomerService) {}

  register(server: McpServer): void {
    server.registerTool(
      'list_customers',
      {
        title: 'List customers',
        description:
          'List or search registered customers. Emails are masked and street addresses and phone numbers are never returned.',
        inputSchema: ListCustomersInputSchema,
        outputSchema: pageSchema(CustomerSummarySchema),
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        { name: 'list_customers', scope: 'customers:read' },
        async (args: ListCustomersInput, { signal }) => {
          const page = await this.customers.list(args, signal);

          return toolSuccess(
            page,
            `Page ${page.page} of ${page.totalPages} (${page.total} customers in total).`
          );
        }
      )
    );

    server.registerTool(
      'get_customer',
      {
        title: 'Get customer',
        description: 'Get one customer by ID, with contact details minimised.',
        inputSchema: GetCustomerInputSchema,
        outputSchema: CustomerSummarySchema,
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        { name: 'get_customer', scope: 'customers:read', subject: 'customer' },
        async ({ customerId }: GetCustomerInput, { signal }) => {
          const customer = await this.customers.get(customerId, signal);

          return toolSuccess(customer);
        }
      )
    );
  }
}
