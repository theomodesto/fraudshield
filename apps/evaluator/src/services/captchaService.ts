import { FastifyInstance } from 'fastify';
import axios from 'axios'; //TODO: move axios to fetch 
import config from '../config';

/**
 * hCaptcha verification service
 */
class CaptchaService {
  private logger: any = console;
  private apiEndpoint = 'https://hcaptcha.com/siteverify';
  private secretKey = '';
  
  /**
   * Initialize CAPTCHA service
   */
  async initialize(server: FastifyInstance): Promise<void> {
    try {
      this.logger = server.log;
      this.logger.info('Initializing CAPTCHA service...');
      
      // Set secret key from config
      this.secretKey = config.hcaptcha.secretKey;
      
      this.logger.info('CAPTCHA service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CAPTCHA service:', error);
      throw error;
    }
  }
  
  /**
   * Verify a CAPTCHA token
   */
  async verifyCaptcha(token: string): Promise<boolean> {
    try {
      // Prepare form data
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      
      // Call hCaptcha verification API
      const response = await axios.post(this.apiEndpoint, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Check response
      if (response.data && response.data.success === true) {
        this.logger.debug('CAPTCHA token verified successfully');
        return true;
      } else {
        const errorCodes = response.data['error-codes'] || [];
        this.logger.warn('CAPTCHA verification failed:', errorCodes);
        return false;
      }
    } catch (error) {
      this.logger.error('Error verifying CAPTCHA token:', error);
      return false;
    }
  }
}

// Export singleton instance
export const captchaService = new CaptchaService();

// Initialize function for service registration
export const initCaptchaService = async (server: FastifyInstance): Promise<void> => {
  await captchaService.initialize(server);
}; 