
import { Product, UserAccount, UserRole } from '../types';
import { usdToGhs } from './currency';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'FY-SH-001',
    name: 'Classic White Shirt',
    description: '100% Cotton premium white shirt',
    priceUsd: 45.00,
    priceGhs: usdToGhs(45.00),
    costUsd: 20.00,
    costGhs: usdToGhs(20.00),
    stock: 50,
    category: 'Apparel',
    image: 'https://picsum.photos/seed/shirt/400/400'
  },
  {
    id: '2',
    sku: 'FY-JN-002',
    name: 'Slim Fit Jeans',
    description: 'Durable blue denim slim fit jeans',
    priceUsd: 89.99,
    priceGhs: usdToGhs(89.99),
    costUsd: 40.00,
    costGhs: usdToGhs(40.00),
    stock: 35,
    category: 'Apparel',
    image: 'https://picsum.photos/seed/jeans/400/400'
  },
  {
    id: '3',
    sku: 'FY-JK-003',
    name: 'Winter Bomber Jacket',
    description: 'Insulated waterproof bomber jacket',
    priceUsd: 120.00,
    priceGhs: usdToGhs(120.00),
    costUsd: 65.00,
    costGhs: usdToGhs(65.00),
    stock: 12,
    category: 'Outerwear',
    image: 'https://picsum.photos/seed/jacket/400/400'
  },
  {
    id: '4',
    sku: 'FY-SN-004',
    name: 'Urban Sneakers',
    description: 'Lightweight breathable mesh sneakers',
    priceUsd: 75.00,
    priceGhs: usdToGhs(75.00),
    costUsd: 35.00,
    costGhs: usdToGhs(35.00),
    stock: 20,
    category: 'Footwear',
    image: 'https://picsum.photos/seed/shoes/400/400'
  }
];

export const MOCK_USERS: UserAccount[] = [
  {
    id: 'u1',
    name: 'Admin Francisca',
    role: UserRole.ADMIN,
    email: 'admin@famyank.com',
    password: 'Famyank0310'
  },
  {
    id: 'u2',
    name: 'Francisca Worker',
    role: UserRole.WORKER,
    email: 'Francisca@famyank.com',
    passwordSalt: '4Vi26S3auUuf6Qv2mDrlIQ==',
    passwordHash: 'ZX2r3vZrjkJKpp7bBP5DboaPOD+LkA20H2pvpCF9Prg='
  }
];
