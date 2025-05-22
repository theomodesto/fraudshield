import { FraudShield } from './fraudShield';
export { FraudShield };
export * from './types';

// Export convenient functions for script tag usage
const init = FraudShield.init.bind(FraudShield);
const getInstance = FraudShield.getInstance.bind(FraudShield);

export { init, getInstance };

// Set up global access for script tag usage
if (typeof window !== 'undefined') {
  (window as any).FraudShield = {
    init,
    getInstance
  };
}

// Auto-initialize from script tag attributes
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const scriptTag = document.querySelector('script[data-merchant-id]');
    
    if (scriptTag) {
      // Get configuration from script tag attributes
      const merchantId = scriptTag.getAttribute('data-merchant-id');
      
      if (merchantId) {
        const apiEndpoint = scriptTag.getAttribute('data-api-endpoint');
        const enableCaptcha = scriptTag.getAttribute('data-enable-captcha') !== 'false';
        const debug = scriptTag.getAttribute('data-debug') === 'true';
        
        // Initialize SDK
        init({
          merchantId,
          apiEndpoint: apiEndpoint || undefined,
          enableCaptcha,
          debug
        });
      }
    }
  });
} 