import { Controller, Get, Param } from '@nestjs/common';

import { ProductsService } from './products.service';

@Controller('v1/offers')
export class OffersController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':uuid')
  findByUuid(@Param('uuid') uuid: string) {
    return this.productsService.findOfferByUuid(uuid);
  }
}
