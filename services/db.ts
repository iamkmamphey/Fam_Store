
import { Product, Sale, DailyReport, UserAccount, UserRole } from '../types';
import { INITIAL_PRODUCTS, MOCK_USERS } from './mockData';
import { ghsToUsd, moneyRound, usdToGhs } from './currency';

const STORAGE_KEYS = {
  PRODUCTS: 'famyank_products',
  SALES: 'famyank_sales',
  REPORTS: 'famyank_reports',
  USERS: 'famyank_users'
};

class FamyankDB {
  private events = new EventTarget();

  constructor() {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    } else {
      // Product pricing migration: ensure both USD + GHS are stored.
      try {
        const products: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        let changed = false;
        const migrated = products.map((p: any) => {
          if (p && typeof p === 'object') {
            // Legacy fields: price/costPrice (assume USD)
            if ((p.priceGhs == null || p.priceUsd == null) && typeof p.price === 'number') {
              p.priceUsd = p.price;
              p.priceGhs = usdToGhs(p.priceUsd);
              delete p.price;
              changed = true;
            }
            if ((p.costGhs == null || p.costUsd == null) && typeof p.costPrice === 'number') {
              p.costUsd = p.costPrice;
              p.costGhs = usdToGhs(p.costUsd);
              delete p.costPrice;
              changed = true;
            }

            // Partial fields: compute the other side if missing
            if (typeof p.priceUsd === 'number' && (p.priceGhs == null || Number.isNaN(p.priceGhs))) {
              p.priceGhs = usdToGhs(p.priceUsd);
              changed = true;
            }
            if (typeof p.priceGhs === 'number' && (p.priceUsd == null || Number.isNaN(p.priceUsd))) {
              p.priceUsd = ghsToUsd(p.priceGhs);
              changed = true;
            }
            if (typeof p.costUsd === 'number' && (p.costGhs == null || Number.isNaN(p.costGhs))) {
              p.costGhs = usdToGhs(p.costUsd);
              changed = true;
            }
            if (typeof p.costGhs === 'number' && (p.costUsd == null || Number.isNaN(p.costUsd))) {
              p.costUsd = ghsToUsd(p.costGhs);
              changed = true;
            }

            // Normalize precision
            if (typeof p.priceGhs === 'number') p.priceGhs = moneyRound(p.priceGhs);
            if (typeof p.priceUsd === 'number') p.priceUsd = moneyRound(p.priceUsd);
            if (typeof p.costGhs === 'number') p.costGhs = moneyRound(p.costGhs);
            if (typeof p.costUsd === 'number') p.costUsd = moneyRound(p.costUsd);
          }
          return p;
        });
        if (changed) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(migrated));
      } catch {
        // ignore
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
    } else {
      // Lightweight migration: keep seeded admin display name in sync
      try {
        const users: UserAccount[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const idx = users.findIndex(u => u.email?.toLowerCase() === 'admin@famyank.com');
        if (idx !== -1 && users[idx].name === 'Admin Jane') {
          users[idx] = { ...users[idx], name: 'Admin Francisca' };
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
      } catch {
        // ignore
      }
    }
  }

  getProducts(): Product[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  }

  getSales(): Sale[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
  }

  getUsers(): UserAccount[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  }

  async authenticate(email: string, password: string): Promise<UserAccount | null> {
    const emailKey = email.trim().toLowerCase();
    const users = this.getUsers();
    const idx = users.findIndex(u => u.email?.toLowerCase() === emailKey);
    if (idx === -1) return null;

    const account = users[idx];

    // Preferred: salted PBKDF2
    if (account.passwordSalt && account.passwordHash) {
      const candidate = await pbkdf2HashBase64(password, account.passwordSalt);
      return candidate === account.passwordHash ? account : null;
    }

    // Legacy fallback: plaintext password (upgrade on successful login)
    if (account.password) {
      if (account.password !== password) return null;
      const { saltB64, hashB64 } = await createPasswordHash(password);
      users[idx] = { ...account, passwordSalt: saltB64, passwordHash: hashB64 };
      delete (users[idx] as any).password;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      this.notify();
      return users[idx];
    }

    return null;
  }

  async addWorkerAccount(input: { name: string; email: string; password: string }): Promise<UserAccount> {
    const name = input.name.trim();
    const email = input.email.trim();
    const password = input.password;

    if (!name) throw new Error('Name is required');
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');

    const users = this.getUsers();
    const emailKey = email.toLowerCase();
    const exists = users.some(u => u.email.toLowerCase() === emailKey);
    if (exists) throw new Error('An account with this email already exists');

    const { saltB64, hashB64 } = await createPasswordHash(password);
    const newUser: UserAccount = {
      id: `u-${Date.now()}`,
      name,
      email,
      passwordSalt: saltB64,
      passwordHash: hashB64,
      role: UserRole.WORKER
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.notify();
    return newUser;
  }

  subscribe(callback: () => void) {
    this.events.addEventListener('change', callback);
    return () => this.events.removeEventListener('change', callback);
  }

  private notify() {
    this.events.dispatchEvent(new Event('change'));
  }

  async executeSale(cart: { product: Product, quantity: number }[], staff: { id: string, name: string }): Promise<Sale> {
    const products = this.getProducts();
    const sales = this.getSales();
    
    let totalAmount = 0;
    let totalProfit = 0;
    const saleItems = [];

    // Atomic update simulation
    for (const item of cart) {
      const pIndex = products.findIndex(p => p.id === item.product.id);
      if (pIndex === -1 || products[pIndex].stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.name}`);
      }

      products[pIndex].stock -= item.quantity;
      // Frontend currency is Ghana cedis; sales are tracked in GHS here.
      const subtotal = item.product.priceGhs * item.quantity;
      const subProfit = (item.product.priceGhs - item.product.costGhs) * item.quantity;
      
      totalAmount += subtotal;
      totalProfit += subProfit;

      saleItems.push({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.priceGhs,
        total: subtotal
      });
    }

    const newSale: Sale = {
      id: `SALE-${Date.now()}`,
      timestamp: Date.now(),
      items: saleItems,
      totalAmount,
      totalProfit,
      staffId: staff.id,
      staffName: staff.name
    };

    sales.push(newSale);
    
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    
    this.notify();
    return newSale;
  }

  updateProduct(updatedProduct: Product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      products[index] = updatedProduct;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      this.notify();
    }
  }

  addProduct(newProduct: Product) {
    const products = this.getProducts();
    products.push(newProduct);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.notify();
  }
}

export const db = new FamyankDB();

async function createPasswordHash(password: string): Promise<{ saltB64: string; hashB64: string }> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltB64 = bytesToBase64(salt);
  const hashB64 = await pbkdf2HashBase64(password, saltB64);
  return { saltB64, hashB64 };
}

async function pbkdf2HashBase64(password: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBytes = base64ToBytes(saltB64);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
