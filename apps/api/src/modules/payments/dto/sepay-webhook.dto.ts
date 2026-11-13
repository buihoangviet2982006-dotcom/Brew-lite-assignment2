import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO nhận payload Webhook từ SePay (hỗ trợ cả chuẩn Webhook và chuẩn SePay API v2 Sandbox)
 */
export class SepayWebhookDto {
  @IsOptional()
  id?: string | number;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  bank_brand_name?: string;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  transaction_date?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  account_number?: string;

  @IsOptional()
  @IsString()
  subAccount?: string | null;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  transaction_content?: string;

  @IsOptional()
  @IsString()
  transferType?: string;

  @IsOptional()
  @IsString()
  transfer_type?: string;

  @IsOptional()
  transferAmount?: number;

  @IsOptional()
  amount_in?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  accumulated?: number;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @IsString()
  reference_number?: string;
}

/**
 * DTO kích hoạt giả lập SePay Sandbox Webhook cho kiểm thử tự động và nút bấm Demo
 */
export class SimulateSepayWebhookDto {
  @IsString()
  @IsNotEmpty({ message: 'orderId không được để trống' })
  orderId: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  transferAmount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['SUCCESS', 'MOCK_FAIL', 'TIMEOUT'])
  scenario?: 'SUCCESS' | 'MOCK_FAIL' | 'TIMEOUT';

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

