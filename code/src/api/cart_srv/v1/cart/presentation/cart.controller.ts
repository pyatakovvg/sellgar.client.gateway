import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../../../identity_srv/v1/session.guard';
import { SessionRequest } from '../../../../identity_srv/v1/session.types';
import { CartService } from '../application/cart.service';
import { AddCartItemDto, RemoveCartItemDto, SetCartItemDto } from './dto/cart-item.dto';
@Controller('v1/cart')
@UseGuards(SessionGuard)
export class CartController {
  constructor(private readonly carts: CartService) {}
  @Get() get(@Req() req: SessionRequest) {
    return this.carts.get(req.principal!);
  }
  @Post('items') add(@Req() req: SessionRequest, @Body() input: AddCartItemDto) {
    return this.carts.add(req.principal!, input);
  }
  @Patch('items/:recordUuid') setQuantity(
    @Req() req: SessionRequest,
    @Param('recordUuid', ParseUUIDPipe) recordUuid: string,
    @Body() input: SetCartItemDto,
  ) {
    return this.carts.setQuantity(req.principal!, recordUuid, input);
  }
  @Delete('items/:recordUuid') remove(
    @Req() req: SessionRequest,
    @Param('recordUuid', ParseUUIDPipe) recordUuid: string,
    @Body() input: RemoveCartItemDto,
  ) {
    return this.carts.remove(req.principal!, recordUuid, input);
  }
}
