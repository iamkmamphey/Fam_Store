
import { Product, UserAccount, UserRole } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'FY-SH-001',
    name: 'Classic White Shirt',
    description: '100% Cotton premium white shirt',
    price: 45.00,
    costPrice: 20.00,
    stock: 50,
    category: 'Apparel',
    image: 'https://picsum.photos/seed/shirt/400/400'
  },
  {
    id: '2',
    sku: 'FY-JN-002',
    name: 'Slim Fit Jeans',
    description: 'Durable blue denim slim fit jeans',
    price: 89.99,
    costPrice: 40.00,
    stock: 35,
    category: 'Apparel',
    image: 'https://picsum.photos/seed/jeans/400/400'
  },
  {
    id: '3',
    sku: 'FY-JK-003',
    name: 'Winter Bomber Jacket',
    description: 'Insulated waterproof bomber jacket',
    price: 120.00,
    costPrice: 65.00,
    stock: 12,
    category: 'Outerwear',
    image: 'https://picsum.photos/seed/jacket/400/400'
  },
  {
    id: '4',
    sku: 'FY-SN-004',
    name: 'Urban Sneakers',
    description: 'Lightweight breathable mesh sneakers',
    price: 75.00,
    costPrice: 35.00,
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
    passwordSalt: 'nmCW6I/Ff8D7oeWYdAoUWA==',
    passwordHash: 'Jki6eKMfdInzCPjpT7QrENjRvd9SK2F7yAlbwITAUk8='
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
