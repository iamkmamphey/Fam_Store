
export enum UserRole {
  ADMIN = 'ADMIN',
  WORKER = 'WORKER',
  CLIENT = 'CLIENT'
}

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  // Do not store plaintext passwords. These fields are persisted in localStorage.
  passwordHash?: string;
  passwordSalt?: string;

  // Legacy field (migrated at runtime). Kept for backward compatibility only.
  password?: string;
}

// Session-safe user shape (no password fields)
export type User = Omit<UserAccount, 'password' | 'passwordHash' | 'passwordSalt'>;

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  image: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  totalAmount: number;
  totalProfit: number;
  staffId: string;
  staffName: string;
}

export interface DailyReport {
  date: string;
  totalSales: number;
  totalProfit: number;
  orderCount: number;
}
