import { CaptchaResult } from '../types';

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: string | HTMLElement, params: any) => number;
      execute: (widgetId?: number) => void;
      reset: (widgetId?: number) => void;
      remove: (widgetId?: number) => void;
    };
  }
}

const HCAPTCHA_SCRIPT_URL = 'https://js.hcaptcha.com/1/api.js';
const CAPTCHA_CONTAINER_ID = 'fraudshield-captcha-container';

/**
 * Load the hCaptcha script if it's not already loaded
 */
const loadHCaptchaScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded
    if (window.hcaptcha) {
      resolve();
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = HCAPTCHA_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    
    // Handle load events
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load hCaptcha script'));
    
    // Add to document
    document.head.appendChild(script);
  });
};

/**
 * Create a container for the captcha if it doesn't exist
 */
const ensureCaptchaContainer = (): HTMLElement => {
  let container = document.getElementById(CAPTCHA_CONTAINER_ID);
  
  if (!container) {
    container = document.createElement('div');
    container.id = CAPTCHA_CONTAINER_ID;
    Object.assign(container.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '9999',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '4px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      display: 'none'
    });
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    Object.assign(closeButton.style, {
      position: 'absolute',
      right: '10px',
      top: '10px',
      background: 'transparent',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer'
    });
    closeButton.onclick = () => {
      container!.style.display = 'none';
    };
    
    container.appendChild(closeButton);
    document.body.appendChild(container);
  }
  
  return container;
};

/**
 * Show the captcha challenge with the given site key
 */
export const showCaptchaChallenge = async (
  siteKey: string
): Promise<CaptchaResult> => {
  try {
    // Load hCaptcha script
    await loadHCaptchaScript();
    
    // Get container
    const container = ensureCaptchaContainer();
    container.style.display = 'block';
    
    // Clean previous captcha if any
    container.innerHTML = '';
    
    // Create inner container for hCaptcha
    const captchaElement = document.createElement('div');
    container.appendChild(captchaElement);
    
    // Create text instruction
    const instructionText = document.createElement('p');
    instructionText.textContent = 'Please complete the security check to continue';
    instructionText.style.textAlign = 'center';
    instructionText.style.marginBottom = '15px';
    container.insertBefore(instructionText, captchaElement);
    
    // Render hCaptcha widget
    return new Promise((resolve) => {
      const widgetId = window.hcaptcha!.render(captchaElement, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token: string) => {
          // Hide container
          container.style.display = 'none';
          
          // Clean up
          window.hcaptcha!.reset(widgetId);
          
          // Resolve promise
          resolve({
            token,
            success: true
          });
        },
        'expired-callback': () => {
          // Reset on expiration
          window.hcaptcha!.reset(widgetId);
        },
        'error-callback': () => {
          // Hide container and resolve with failure
          container.style.display = 'none';
          resolve({
            token: '',
            success: false
          });
        }
      });
      
      // Execute hCaptcha challenge (for invisible captcha)
      window.hcaptcha!.execute(widgetId);
    });
  } catch (error) {
    console.error('[FraudShield] Error showing CAPTCHA challenge:', error);
    return {
      token: '',
      success: false
    };
  }
}; 