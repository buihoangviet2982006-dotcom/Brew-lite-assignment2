import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extractPaymentRef, VietQrBankInfo } from './utils/vietqr.util';

export interface SepaySandboxBankAccount {
  id: string;
  bank_short_name?: string;
  bank_brand_name?: string;
  bank_full_name?: string;
  account_number: string;
  account_holder_name?: string;
  label?: string;
  accumulated?: number;
  active?: boolean | number;
}

export interface SepaySandboxTransaction {
  id: string;
  transaction_date?: string;
  account_number?: string;
  va?: string | null;
  transfer_type?: 'in' | 'out' | string;
  amount_in?: number | string;
  amount_out?: number | string;
  accumulated?: number | string;
  transaction_content?: string;
  reference_number?: string;
  code?: string | null;
  bank_brand_name?: string;
  bank_account_id?: string;
  webhook_success?: number;
}

export interface MatchedSepayTransaction {
  id: string;
  amountIn: number;
  content: string;
  referenceNumber: string;
  bankBrandName: string;
  transactionDate: string;
}

@Injectable()
export class SepaySandboxClient {
  private readonly logger = new Logger(SepaySandboxClient.name);
  private cachedBankInfo: { data: VietQrBankInfo; expiresAt: number } | null =
    null;

  constructor(private readonly configService: ConfigService) {}

  getBaseUrl(): string {
    return (
      this.configService.get<string>('SEPAY_API_BASE_URL') ||
      'https://userapi-sandbox.sepay.vn/v2'
    ).replace(/\/+$/, '');
  }

  getApiToken(): string {
    return (
      this.configService.get<string>('SEPAY_API_TOKEN') ||
      this.configService.get<string>('SEPAY_SANDBOX_API_TOKEN') ||
      this.configService.get<string>('SEPAY_API_KEY') ||
      ''
    ).trim();
  }

  getFallbackBankInfo(): VietQrBankInfo {
    return {
      bankId: (
        this.configService.get<string>('VIETQR_BANK_ID') || 'MB'
      ).trim(),
      accountNo: (
        this.configService.get<string>('VIETQR_ACCOUNT_NO') || '0000000001'
      ).trim(),
      accountName: (
        this.configService.get<string>('VIETQR_ACCOUNT_NAME') ||
        'BrewLite'
      ).trim(),
      template: (
        this.configService.get<string>('VIETQR_TEMPLATE') || 'compact2'
      ).trim(),
      source: 'ENV_FALLBACK',
    };
  }

  /**
   * Gọi GET https://userapi-sandbox.sepay.vn/v2/bank-accounts
   * theo tài liệu Test mode SePay API v2
   */
  async listBankAccounts(): Promise<SepaySandboxBankAccount[]> {
    const token = this.getApiToken();
    if (!token) {
      return [];
    }

    const url = `${this.getBaseUrl()}/bank-accounts`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `SePay Sandbox /v2/bank-accounts trả về mã HTTP ${response.status}`,
        );
        return [];
      }

      const payload = (await response.json()) as {
        status?: string;
        data?: SepaySandboxBankAccount[];
      };

      return Array.isArray(payload?.data) ? payload.data : [];
    } catch (error) {
      this.logger.warn(
        `Không thể kết nối SePay Sandbox /v2/bank-accounts: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Ưu tiên sử dụng cấu hình tài khoản ngân hàng VIETQR_* trong file .env nếu đã được khai báo tường minh,
   * hoặc tự động lấy tài khoản ngân hàng từ SePay Test mode (nếu chưa cấu hình VIETQR_ACCOUNT_NO trong .env).
   */
  async resolveVietQrBankConfig(): Promise<VietQrBankInfo> {
    const fallback = this.getFallbackBankInfo();
    const explicitEnvAccountNo = (
      this.configService.get<string>('VIETQR_ACCOUNT_NO') || ''
    ).trim();

    // Nếu người dùng đã cấu hình tường minh VIETQR_ACCOUNT_NO trong .env, sử dụng trực tiếp cấu hình .env
    if (explicitEnvAccountNo) {
      return fallback;
    }

    const now = Date.now();
    if (this.cachedBankInfo && this.cachedBankInfo.expiresAt > now) {
      return this.cachedBankInfo.data;
    }

    const token = this.getApiToken();
    if (!token) {
      return fallback;
    }

    const accounts = await this.listBankAccounts();
    const activeAccount =
      accounts.find((acc) => acc.active !== false && acc.active !== 0) ||
      accounts[0];

    if (!activeAccount || !activeAccount.account_number) {
      return fallback;
    }

    const resolved: VietQrBankInfo = {
      bankId: (
        activeAccount.bank_short_name ||
        activeAccount.bank_brand_name ||
        fallback.bankId
      ).trim(),
      accountNo: String(activeAccount.account_number).trim(),
      accountName: (
        activeAccount.account_holder_name || fallback.accountName
      ).trim(),
      template: fallback.template,
      source: 'SEPAY_SANDBOX_API',
    };

    this.cachedBankInfo = {
      data: resolved,
      expiresAt: now + 60_000,
    };

    return resolved;
  }

  /**
   * Chủ động Polling danh sách giao dịch từ SePay Sandbox API v2:
   * GET https://userapi-sandbox.sepay.vn/v2/transactions?per_page=20
   * Hỗ trợ cả khớp chính xác mã BREW... và khớp thông minh giao dịch mô phỏng mới nhất trên SePay Sandbox.
   */
  async findMatchingIncomingTransaction(
    paymentRef: string,
    requiredAmount: number,
    options?: {
      orderCreatedAt?: Date;
      processedTxIds?: Set<string>;
    },
  ): Promise<MatchedSepayTransaction | null> {
    const token = this.getApiToken();
    if (!token || !paymentRef) {
      return null;
    }

    const normalizedRef = paymentRef.trim().toUpperCase();
    const url = `${this.getBaseUrl()}/transactions?per_page=20`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `SePay Sandbox /v2/transactions trả về mã HTTP ${response.status}`,
        );
        return null;
      }

      const payload = (await response.json()) as {
        status?: string;
        data?: SepaySandboxTransaction[];
        transactions?: SepaySandboxTransaction[];
      };

      const transactions = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.transactions)
          ? payload.transactions
          : [];

      // Lượt 1: Khớp chính xác mã tham chiếu BREW... trong nội dung chuyển khoản hoặc code
      for (const tx of transactions) {
        const txId = String(tx.id ?? '');
        if (txId && options?.processedTxIds?.has(txId)) {
          continue;
        }

        const transferType = String(tx.transfer_type ?? 'in').toLowerCase();
        if (transferType !== 'in') {
          continue;
        }

        const amountIn = Number(tx.amount_in ?? 0);
        const content = String(tx.transaction_content ?? '');
        const extractedFromContent = extractPaymentRef(content);
        const extractedFromCode = extractPaymentRef(tx.code ?? '');

        const isMatched =
          extractedFromContent === normalizedRef ||
          extractedFromCode === normalizedRef ||
          content.toUpperCase().includes(normalizedRef);

        if (isMatched) {
          return {
            id: txId,
            amountIn: amountIn > 0 ? amountIn : requiredAmount,
            content,
            referenceNumber: String(tx.reference_number ?? ''),
            bankBrandName: String(tx.bank_brand_name ?? ''),
            transactionDate: String(tx.transaction_date ?? ''),
          };
        }
      }

      // Lượt 2 (Hỗ trợ mô phỏng nhanh trên SePay Sandbox khi người dùng không nhập mã BREW...):
      // Khớp giao dịch tiền vào mới phát sinh sau thời điểm tạo đơn (hoặc khớp đúng số tiền đơn hàng)
      for (const tx of transactions) {
        const txId = String(tx.id ?? '');
        if (!txId || options?.processedTxIds?.has(txId)) {
          continue;
        }

        const transferType = String(tx.transfer_type ?? 'in').toLowerCase();
        if (transferType !== 'in') {
          continue;
        }

        const amountIn = Number(tx.amount_in ?? 0);
        const content = String(tx.transaction_content ?? '');
        const hasOtherOrderRef = Boolean(extractPaymentRef(content));
        if (hasOtherOrderRef) {
          continue;
        }

        let isRecentForOrder = false;
        if (options?.orderCreatedAt && tx.transaction_date) {
          const parsedTxTime = new Date(
            tx.transaction_date.replace(' ', 'T'),
          ).getTime();
          if (
            !Number.isNaN(parsedTxTime) &&
            parsedTxTime >= options.orderCreatedAt.getTime() - 60_000
          ) {
            isRecentForOrder = true;
          }
        }

        if (amountIn === requiredAmount || isRecentForOrder) {
          return {
            id: txId,
            amountIn: amountIn > 0 ? amountIn : requiredAmount,
            content: content || normalizedRef,
            referenceNumber: String(tx.reference_number ?? ''),
            bankBrandName: String(tx.bank_brand_name ?? ''),
            transactionDate: String(tx.transaction_date ?? ''),
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `Không thể kết nối SePay Sandbox /v2/transactions khi polling: ${(error as Error).message}`,
      );
      return null;
    }
  }
}

