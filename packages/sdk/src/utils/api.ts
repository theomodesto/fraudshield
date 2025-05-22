import { ApiResponse } from '../types';

const DEFAULT_API_ENDPOINT = 'https://api.fraudshield.io/v1';
const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * API client for making requests to FraudShield backend
 */
export class ApiClient {
  private apiEndpoint: string;
  private merchantId: string;
  private debug: boolean;
  
  constructor(options: {
    apiEndpoint?: string;
    merchantId: string;
    debug?: boolean;
  }) {
    this.apiEndpoint = options.apiEndpoint || DEFAULT_API_ENDPOINT;
    this.merchantId = options.merchantId;
    this.debug = options.debug || false;
  }
  
  /**
   * Make a GET request to the API
   */
  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path);
  }
  
  /**
   * Make a POST request to the API
   */
  async post<T>(path: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, data);
  }
  
  /**
   * Make a PUT request to the API
   */
  async put<T>(path: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, data);
  }
  
  /**
   * Send a request to the API with timeout and error handling
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    const url = `${this.apiEndpoint}${path}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': this.merchantId,
      'X-SDK-Version': 'js-1.0.0'
    };
    
    const options: RequestInit = {
      method,
      headers,
      credentials: 'omit', // Don't include cookies
      body: data ? JSON.stringify(data) : undefined
    };
    
    // Log request in debug mode
    if (this.debug) {
      console.debug('[FraudShield API] Request:', { url, method, data });
    }
    
    try {
      // Add timeout handling
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), DEFAULT_TIMEOUT);
      });
      
      // Make fetch request
      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ]) as Response;
      
      // Parse response
      const responseData = await response.json();
      
      // Log response in debug mode
      if (this.debug) {
        console.debug('[FraudShield API] Response:', responseData);
      }
      
      if (!response.ok) {
        return {
          error: {
            code: String(response.status),
            message: response.statusText,
            details: responseData
          }
        };
      }
      
      return { data: responseData };
    } catch (error) {
      if (this.debug) {
        console.error('[FraudShield API] Error:', error);
      }
      
      return {
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      };
    }
  }
} 