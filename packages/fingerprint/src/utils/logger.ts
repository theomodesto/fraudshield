import { Logger } from '../types';

/**
 * Simple logger implementation with debug level control
 */
export class ConsoleLogger implements Logger {
  private debugEnabled: boolean;
  private prefix: string;
  
  constructor(options: { debug?: boolean; prefix?: string } = {}) {
    this.debugEnabled = options.debug || false;
    this.prefix = options.prefix || '[FraudShield Fingerprint]';
  }
  
  debug(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.debug(`${this.prefix} ${message}`, ...args);
    }
  }
  
  info(message: string, ...args: any[]): void {
    console.info(`${this.prefix} ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} ${message}`, ...args);
  }
}

/**
 * No-op logger for production environments
 */
export class NoopLogger implements Logger {
  debug(_message: string, ..._args: any[]): void {}
  info(_message: string, ..._args: any[]): void {}
  warn(_message: string, ..._args: any[]): void {}
  error(_message: string, ..._args: any[]): void {}
}

/**
 * Factory function to get the appropriate logger
 */
export const getLogger = (options: { debug?: boolean; prefix?: string } = {}): Logger => {
  return options.debug ? new ConsoleLogger(options) : new NoopLogger();
}; 