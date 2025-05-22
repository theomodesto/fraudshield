/**
 * A simple but effective hashing function for fingerprinting
 * Optimized for speed and collision resistance
 */
export const hashString = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}; 