export interface FingerprintOptions {
  debug?: boolean;
  cacheExpiration?: number;
  cacheExpirationCheck?: boolean;
  cachingEnabled?: boolean;
  failsafeTimeout?: number;
  enabledSignals?: {
    canvas?: boolean;
    webgl?: boolean;
    audio?: boolean;
    fonts?: boolean;
    incognito?: boolean;
  };
}

export interface DeviceData {
  visitorId: string;
  requestId: string;
  incognito: boolean;
  browserName: string;
  deviceType: string;
  os: string;
  confidence?: number;
  collectedAt?: string;
  signals?: Record<string, any>;
}

export interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  deviceType: string;
}

export interface SignalCollectionResult {
  hash: string;
  [key: string]: any;
}

export interface Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expirationMs?: number): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
} 