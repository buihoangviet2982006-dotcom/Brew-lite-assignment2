export interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
  stockQuantity?: number;
}
