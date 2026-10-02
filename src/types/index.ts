export interface ProductImage {
  url: string;
  mobileUrl?: string;
  altText: string;
  isPrimary: boolean;
}

export interface ProductVariant {
  size: "S" | "M" | "L" | "XL" | "XXL";
  stockCount: number;
  sku: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  gsmRating?: string;
  fabricDetails: string;
  images: ProductImage[];
  category: string;
  subcategory?: string;
  homepageSlot: string;
  variants: ProductVariant[];
  colors?: ProductColor[];
  tags?: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  helpful: number;
  verified: boolean;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  createdAt: string;
  role: 'customer' | 'admin';
}

export interface Order {
  id: string;
  orderNumber?: number;
  userId: string;
  userEmail: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  paymentMethod: string;
  couponCode?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
