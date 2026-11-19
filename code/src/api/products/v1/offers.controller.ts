import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';

import { ProductsService } from './products.service';
import { ProductsQueryDto } from './dto/products-query.dto';

@Controller('v1/offers')
export class OffersController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':uuid')
  findByUuid(@Param('uuid', new ParseUUIDPipe()) uuid: string, @Query() query: ProductsQueryDto) {
    return this.productsService.findOfferByUuid(uuid, query);
  }
}
