import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type PaymentSimulationScenario =
  | 'QR'
  | 'SUCCESS'
  | 'MOCK_FAIL'
  | 'TIMEOUT';

export class CreatePaymentDto {
  @IsString({ message: 'Mã đơn hàng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã đơn hàng không được để trống' })
  orderId: string;

  @IsString({ message: 'Phương thức thanh toán phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  method: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(['QR', 'SUCCESS', 'MOCK_FAIL', 'TIMEOUT'], {
    message:
      'Kịch bản mô phỏng phải thuộc một trong các giá trị: QR, SUCCESS, MOCK_FAIL, TIMEOUT',
  })
  simulateScenario?: PaymentSimulationScenario;
}

