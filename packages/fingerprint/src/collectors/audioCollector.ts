import { hashString } from '../utils/hash';

interface AudioFingerprint {
  hash: string;
  data?: Float32Array;
}

/**
 * Collect audio fingerprint based on audio processing
 */
export const collectAudioFingerprint = async (): Promise<AudioFingerprint> => {
  try {
    // Check if AudioContext is supported
    if (typeof window === 'undefined' || !window.AudioContext && !(window as any).webkitAudioContext) {
      return { hash: '' };
    }
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContext();
    
    // Create oscillator and analyzer
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    
    // Configure oscillator
    oscillator.type = 'triangle'; // Use triangle wave
    oscillator.frequency.setValueAtTime(10000, context.currentTime); // High frequency
    
    // Configure analyzer
    analyser.fftSize = 1024;
    
    // Create compressor to alter the signal
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);
    
    // Connect the nodes
    oscillator.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(context.destination);
    
    // Start the oscillator (no audible sound due to high frequency and short duration)
    oscillator.start(0);
    oscillator.stop(context.currentTime + 0.01); // Stop after 10ms
    
    // Capture the frequency data
    return new Promise((resolve) => {
      setTimeout(() => {
        const frequencies = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(frequencies);
        
        // Process frequency data for fingerprinting
        const frequencyData = Array.from(frequencies)
          .slice(0, 127)  // Use only the first 127 values for consistency
          .map(Math.abs)  // Get absolute values
          .join(',');     // Convert to string
          
        // Generate hash
        const hash = hashString(frequencyData);
        
        // Close the audio context to free up resources
        if (context.state !== 'closed' && typeof context.close === 'function') {
          context.close();
        }
        
        resolve({ hash, data: frequencies });
      }, 50); // Wait 50ms for processing
    });
  } catch (error) {
    console.warn('Error collecting audio fingerprint:', error);
    return { hash: '' };
  }
}; 