export type SizeCode = "S" | "M" | "L";

export interface SizeOption {
  code: SizeCode;
  label: string;
  extraPrice: number;
}

export interface ToppingOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface SelectedProductOptions {
  productId: string;
  productName: string;
  basePrice: number;
  imageUrl?: string;
  size: SizeOption;
  toppings: ToppingOption[];
  quantity: number;
  note: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    size?: string;
    toppings?: string;
    quantity?: string;
    note?: string;
  };
}

export const PRODUCT_SIZES: SizeOption[] = [
  { code: "S", label: "Nhỏ (S)", extraPrice: 0 },
  { code: "M", label: "Vừa (M)", extraPrice: 6000 },
  { code: "L", label: "Lớn (L)", extraPrice: 10000 },
];

export const PRODUCT_TOPPINGS: ToppingOption[] = [
  { id: "tp-pearl-black", name: "Trân châu đen", price: 8000, isAvailable: true },
  { id: "tp-pearl-white", name: "Trân châu trắng", price: 8000, isAvailable: true },
  { id: "tp-macchiato", name: "Kem Cheese Macchiato", price: 12000, isAvailable: true },
  { id: "tp-coffee-jelly", name: "Thạch cà phê", price: 7000, isAvailable: true },
  { id: "tp-flan", name: "Bánh Flan trứng", price: 10000, isAvailable: true },
];

export const MAX_TOPPINGS_PER_ITEM = 3;
export const MAX_QUANTITY_PER_ITEM = 20;
export const MAX_NOTE_LENGTH = 120;

/**
 * Tính đơn giá 1 ly = Giá gốc + Phụ thu Size + Tổng tiền Topping
 */
export function calculateConfiguredUnitPrice(
  basePrice: number,
  size: SizeOption | null,
  toppings: ToppingOption[]
): number {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  const sizeExtra = Math.max(0, Number(size?.extraPrice) || 0);
  const toppingSum = toppings.reduce(
    (sum, item) => sum + Math.max(0, Number(item.price) || 0),
    0
  );
  return safeBase + sizeExtra + toppingSum;
}

/**
 * Tính tổng tiền = Đơn giá 1 ly * Số lượng
 */
export function calculateConfiguredTotalPrice(
  basePrice: number,
  size: SizeOption | null,
  toppings: ToppingOption[],
  quantity: number
): number {
  const unitPrice = calculateConfiguredUnitPrice(basePrice, size, toppings);
  const validQty = Math.max(1, Math.floor(Number(quantity) || 1));
  return unitPrice * validQty;
}

/**
 * Kiểm tra hợp lệ (Validation) các tùy chọn người dùng đã chọn
 */
export function validateProductOptions(input: {
  size: SizeOption | null;
  toppings: ToppingOption[];
  quantity: number;
  note: string;
  maxStock?: number;
}): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  // 1. Bắt buộc phải chọn 1 Size hợp lệ
  if (!input.size || !PRODUCT_SIZES.some((s) => s.code === input.size?.code)) {
    errors.size = "Vui lòng chọn kích cỡ đồ uống (S, M hoặc L).";
  }

  // 2. Giới hạn số lượng Topping tối đa và không trùng lặp
  if (input.toppings.length > MAX_TOPPINGS_PER_ITEM) {
    errors.toppings = `Chỉ được chọn tối đa ${MAX_TOPPINGS_PER_ITEM} loại topping cho 1 ly.`;
  } else if (input.toppings.some((t) => !t.isAvailable)) {
    errors.toppings = "Có loại topping bạn chọn hiện đã hết hàng.";
  }

  // 3. Kiểm tra số lượng đặt và tồn kho
  const limitStock = input.maxStock ?? MAX_QUANTITY_PER_ITEM;
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    errors.quantity = "Số lượng phải từ 1 ly trở lên.";
  } else if (input.quantity > limitStock) {
    errors.quantity = `Số lượng tối đa cho phép là ${limitStock} ly.`;
  }

  // 4. Kiểm tra độ dài ghi chú
  if (input.note.trim().length > MAX_NOTE_LENGTH) {
    errors.note = `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}