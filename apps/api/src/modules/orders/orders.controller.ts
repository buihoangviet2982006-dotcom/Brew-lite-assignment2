import { Body, Controller, Post, Get, Param, Req, UseGuards } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  AuthenticatedRequest,
  OrderJwtAuthGuard,
} from './guards/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OrderJwtAuthGuard)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(req.user.id, createOrderDto); 
  }
@Get()
@UseGuards(OrderJwtAuthGuard)
async findMyOrders(@Req() req: AuthenticatedRequest) {
  return this.ordersService.findOrdersByUser(req.user.id);
  }
@Get(':id')
@UseGuards(OrderJwtAuthGuard)
async findMyOrder(
  @Req() req: AuthenticatedRequest,
  @Param('id') orderId: string,
) {
  return this.ordersService.findOrderById(
    req.user.id,
    orderId,
  );
  }
}
