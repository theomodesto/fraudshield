import { Storage } from '../types';

/**
 * Default storage implementation using localStorage with fallbacks
 */
export class LocalStorage implements Storage {
  private namespace: string;
  
  constructor(namespace: string = 'fraudshield_fp_') {
    this.namespace = namespace;
  }
  
  private getFullKey(key: string): string {
    return `${this.namespace}${key}`;
  }
  
  async get(key: string): Promise<string | null> {
    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);
      
      if (!item) {
        return null;
      }
      
      const { value, expiration } = JSON.parse(item);
      
      // Check if item is expired
      if (expiration && Date.now() > expiration) {
        await this.remove(key);
        return null;
      }
      
      return value;
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  }
  
  async set(key: string, value: string, expirationMs?: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const item = {
        value,
        expiration: expirationMs ? Date.now() + expirationMs : null
      };
      
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
    }
  }
  
  async remove(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
    }
  }
}

/**
 * In-memory storage implementation for environments without localStorage
 */
export class MemoryStorage implements Storage {
  private storage: Record<string, { value: string; expiration: number | null }> = {};
  
  async get(key: string): Promise<string | null> {
    const item = this.storage[key];
    
    if (!item) {
      return null;
    }
    
    // Check if item is expired
    if (item.expiration && Date.now() > item.expiration) {
      await this.remove(key);
      return null;
    }
    
    return item.value;
  }
  
  async set(key: string, value: string, expirationMs?: number): Promise<void> {
    this.storage[key] = {
      value,
      expiration: expirationMs ? Date.now() + expirationMs : null
    };
  }
  
  async remove(key: string): Promise<void> {
    delete this.storage[key];
  }
}

/**
 * Factory function to get the best available storage implementation
 */
export const getStorage = (namespace?: string): Storage => {
  try {
    // Test if localStorage is available
    localStorage.setItem('__storage_test__', '1');
    localStorage.removeItem('__storage_test__');
    return new LocalStorage(namespace);
  } catch (e) {
    // Fallback to memory storage if localStorage is not available
    return new MemoryStorage();
  }
}; 