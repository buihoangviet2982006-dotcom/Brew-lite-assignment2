import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductSize } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã sản phẩm không được để trống' })
  productId: string;

  @IsOptional()
  @IsEnum(ProductSize, { message: 'Kích cỡ sản phẩm phải là S, M hoặc L' })
  size?: ProductSize = ProductSize.M;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng mỗi món phải từ 1 trở lên' })
  quantity: number;

  @IsOptional()
  @IsArray({ message: 'Danh sách topping phải là mảng' })
  @IsString({ each: true })
  @ArrayUnique({ message: 'Không được chọn trùng topping trong cùng một món' })
  toppingIds?: string[];
}

export class CreateOrderDto {
  @IsArray({ message: 'Danh sách món đặt phải là mảng' })
  @ArrayMinSize(1, { message: 'Giỏ hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  promotionCode?: string;
}