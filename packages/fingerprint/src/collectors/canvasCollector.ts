import { hashString } from '../utils/hash';

/**
 * Collect canvas fingerprint
 * Returns a hash of rendered canvas content
 */
export const collectCanvasFingerprint = async (): Promise<string> => {
  try {
    // Check if canvas is supported
    if (typeof document === 'undefined' || !document.createElement) {
      return '';
    }
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return '';
    }
    
    // Set dimensions and draw complex shapes/text
    canvas.width = 240;
    canvas.height = 140;
    
    // Fill background
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    ctx.fillStyle = 'rgb(255, 0, 0)';
    ctx.font = '18px Arial';
    ctx.fillText('FraudShield Fingerprint', 10, 20);
    ctx.fillText('Canvas Test', 10, 50);
    
    // Add complex shapes
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.beginPath();
    ctx.arc(50, 100, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgb(255, 255, 0)';
    ctx.beginPath();
    ctx.moveTo(100, 70);
    ctx.lineTo(150, 130);
    ctx.lineTo(50, 130);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgb(0, 0, 255)';
    ctx.font = '14px Courier New';
    ctx.fillText('!@#$%^&*()', 150, 50);
    
    // Apply shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgb(100, 100, 100)';
    ctx.fillStyle = 'rgb(200, 0, 200)';
    ctx.fillRect(180, 80, 40, 40);
    
    // Extract data URL and hash it
    const dataUrl = canvas.toDataURL();
    return hashString(dataUrl);
  } catch (error) {
    console.warn('Error collecting canvas fingerprint:', error);
    return '';
  }
}; 