export interface VietQrBuildParams {
  bankId: string;
  accountNo: string;
  accountName?: string;
  amount: number;
  paymentRef: string;
  template?: string;
}

export interface VietQrBankInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
  template: string;
  source: 'SEPAY_SANDBOX_API' | 'ENV_FALLBACK';
}

/**
 * Sinh mã tham chiếu thanh toán tất định (deterministic) từ orderId
 * Ví dụ: orderId = "f9e8d7c6-b5a4-..." -> "BREWF9E8D7C6"
 */
export function generatePaymentRef(orderId: string): string {
  const cleaned = orderId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
  return `BREW${cleaned || 'ORDER001'}`;
}

/**
 * Bóc tách mã tham chiếu BREW... từ nội dung chuyển khoản ngân hàng hoặc mã code SePay
 */
export function extractPaymentRef(content?: string | null): string | null {
  if (!content || typeof content !== 'string') {
    return null;
  }
  const match = content.toUpperCase().match(/(BREW[A-Z0-9]{4,32})/);
  return match ? match[1] : null;
}

/**
 * Kiểm tra một orderId có khớp với mã tham chiếu paymentRef hay không
 */
export function matchesPaymentRef(
  orderId: string,
  candidatePaymentRef?: string | null,
): boolean {
  if (!candidatePaymentRef) {
    return false;
  }
  return (
    generatePaymentRef(orderId) === candidatePaymentRef.trim().toUpperCase()
  );
}

/**
 * Tạo đường dẫn ảnh mã QR động theo chuẩn VietQR (img.vietqr.io)
 */
export function buildVietQrUrl(params: VietQrBuildParams): string {
  const bankId = (params.bankId || 'MB').trim();
  const accountNo = (params.accountNo || '0123456789').trim();
  const template = (params.template || 'compact2').trim();
  const amount = Math.max(0, Math.round(Number(params.amount) || 0));
  const paymentRef = params.paymentRef.trim().toUpperCase();

  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: paymentRef,
  });

  if (params.accountName && params.accountName.trim()) {
    query.set('accountName', params.accountName.trim());
  }

  return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-${encodeURIComponent(template)}.png?${query.toString()}`;
}

