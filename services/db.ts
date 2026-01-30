
import { Product, Sale, DailyReport, UserAccount, UserRole } from '../types';
import { INITIAL_PRODUCTS, MOCK_USERS } from './mockData';
import { ghsToUsd, moneyRound, usdToGhs } from './currency';

const STORAGE_KEYS = {
  PRODUCTS: 'famyank_products',
  SALES: 'famyank_sales',
  REPORTS: 'famyank_reports',
  USERS: 'famyank_users'
};

const API_BASE = '/api';

class FamyankDB {
  private events = new EventTarget();

  constructor() {
    const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!storedProducts) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    } else {
      // Check if we have enough products, if not restore the initial 40
      try {
        const products: Product[] = JSON.parse(storedProducts);
        if (products.length < 40) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        }
      } catch {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
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

    this.syncProductsFromBackend().then((synced) => {
      if (!synced) this.persistProductsToBackend(this.getProducts());
    });

    setInterval(() => {
      this.syncProductsFromBackend();
    }, 15000);
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

  private async syncProductsFromBackend(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) return false;
      const products = await res.json();
      if (!Array.isArray(products)) return false;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  private async persistProductsToBackend(products: Product[]) {
    try {
      await fetch(`${API_BASE}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });
    } catch {
      // ignore backend sync errors
    }
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
    this.persistProductsToBackend(products);
    this.notify();
    return newSale;
  }

  updateProduct(updatedProduct: Product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      products[index] = updatedProduct;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      this.persistProductsToBackend(products);
      this.notify();
    }
  }

  addProduct(newProduct: Product) {
    const products = this.getProducts();
    products.push(newProduct);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.persistProductsToBackend(products);
    this.notify();
  }

  resetSales() {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    this.notify();
  }

  restoreInitialProducts() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    this.persistProductsToBackend(INITIAL_PRODUCTS);
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
