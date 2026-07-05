import { Controller, Get, Query } from '@nestjs/common';

import { ProductsService } from './products.service';

@Controller('v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    const query: Record<string, unknown> = {};

    if (search?.trim()) {
      query.search = search.trim();
    }

    return this.productsService.findAll(query);
  }
}
