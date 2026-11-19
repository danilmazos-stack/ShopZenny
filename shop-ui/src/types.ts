export interface Product {
  id: number;
  name: string;
  price: number;
}

export interface ProductDto {
  name: string;
  price: number;
}

export interface Toast {
  message: string;
  type: 'success' | 'error';
}