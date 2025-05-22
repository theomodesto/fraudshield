/**
 * Wrapper for session storage
 */
export const sessionStore = {
  /**
   * Get item from session storage
   */
  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('[FraudShield] Error reading from session storage:', error);
      return null;
    }
  },
  
  /**
   * Set item in session storage
   */
  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('[FraudShield] Error writing to session storage:', error);
    }
  },
  
  /**
   * Remove item from session storage
   */
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('[FraudShield] Error removing from session storage:', error);
    }
  }
};

/**
 * Generate a random session ID if one doesn't exist
 */
export const getOrCreateSessionId = (): string => {
  const SESSION_KEY = 'fraudshield_session_id';
  let sessionId = sessionStore.get<string>(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStore.set(SESSION_KEY, sessionId);
  }
  
  return sessionId;
};

/**
 * Generate a random session ID
 */
const generateSessionId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}; 