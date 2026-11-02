import { z } from 'zod';
import { Injectable } from '@nestjs/common';

import {
  pageSchema,
  ProductDetailSchema,
  ProductSummarySchema
} from '@woocommerce-mcp/shared';

import { guardTool } from '@/core/mcp/guard-tool';
import { toolSuccess } from '@/core/mcp/tool-result';
import { idSchema, paginationShape } from '@/core/mcp/tool-input';
import { ProductService } from '@/modules/product/product.service';

import type { McpServer } from '@modelcontextprotocol/server';

const ProductPageSchema = pageSchema(ProductSummarySchema);

const GetProductInputSchema = z.object({ productId: idSchema('product') });

const ListProductsInputSchema = z.object({
  ...paginationShape,
  status: z
    .enum(['publish', 'draft', 'pending', 'private', 'any'])
    .default('publish')
    .describe('Publication status filter'),
  stockStatus: z
    .enum(['instock', 'outofstock', 'onbackorder'])
    .optional()
    .describe('Only products with this stock status'),
  category: idSchema('category').optional()
});

const SearchProductsInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .describe('Text to match against product name, description and SKU'),
  ...paginationShape
});

const DeleteProductInputSchema = z.object({
  productId: idSchema('product'),
  confirmSku: z
    .string()
    .min(1)
    .describe(
      "The product's SKU, repeated as a safeguard against deleting the wrong product"
    ),
  permanent: z
    .boolean()
    .default(false)
    .describe('Delete permanently instead of moving to the trash')
});

type GetProductInput = z.infer<typeof GetProductInputSchema>;

type ListProductsInput = z.infer<typeof ListProductsInputSchema>;

type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

type DeleteProductInput = z.infer<typeof DeleteProductInputSchema>;

@Injectable()
export class ProductTools {
  constructor(private readonly products: ProductService) {}

  register(server: McpServer): void {
    server.registerTool(
      'list_products',
      {
        title: 'List products',
        description:
          'List products in the store, one page at a time. Returns price, stock status and stock quantity for each product. Use totalPages to decide whether to fetch more pages.',
        inputSchema: ListProductsInputSchema,
        outputSchema: ProductPageSchema,
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        { name: 'list_products', scope: 'products:read' },
        async (args: ListProductsInput, { signal }) => {
          const page = await this.products.list(args, signal);

          return toolSuccess(
            page,
            `Page ${page.page} of ${page.totalPages} (${page.total} products in total).`
          );
        }
      )
    );

    server.registerTool(
      'get_product',
      {
        title: 'Get product',
        description:
          'Get one product by ID, including its description, pricing and stock.',
        inputSchema: GetProductInputSchema,
        outputSchema: ProductDetailSchema,
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        { name: 'get_product', scope: 'products:read', subject: 'product' },
        async ({ productId }: GetProductInput, { signal }) => {
          const product = await this.products.get(productId, signal);

          return toolSuccess(product);
        }
      )
    );

    server.registerTool(
      'search_products',
      {
        title: 'Search products',
        description:
          'Search products by keyword or SKU. Includes drafts and other unpublished products.',
        inputSchema: SearchProductsInputSchema,
        outputSchema: ProductPageSchema,
        annotations: { readOnlyHint: true, openWorldHint: true }
      },
      guardTool(
        { name: 'search_products', scope: 'products:read' },
        async (args: SearchProductsInput, { signal }) => {
          const page = await this.products.list(
            {
              search: args.query,
              status: 'any',
              page: args.page,
              perPage: args.perPage
            },
            signal
          );

          return toolSuccess(
            page,
            `${page.total} products match "${args.query}".`
          );
        }
      )
    );

    server.registerTool(
      'delete_product',
      {
        title: 'Delete product',
        description:
          'Move a product to the trash, or delete it permanently. The SKU must be repeated in confirmSku. Clients should require explicit human approval before calling this.',
        inputSchema: DeleteProductInputSchema,
        outputSchema: z.object({
          product: ProductSummarySchema,
          permanent: z.boolean()
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      guardTool(
        { name: 'delete_product', scope: 'products:write', subject: 'product' },
        async (args: DeleteProductInput, { signal }) => {
          const product = await this.products.delete(
            args.productId,
            args.confirmSku,
            args.permanent,
            signal
          );
          const summary = args.permanent
            ? `Deleted "${product.name}" permanently.`
            : `Moved "${product.name}" to the trash.`;

          return toolSuccess({ product, permanent: args.permanent }, summary);
        }
      )
    );
  }
}
