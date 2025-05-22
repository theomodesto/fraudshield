interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  deviceType: string;
}

/**
 * Detects browser, OS, and device information
 */
export const getBrowserInfo = (): BrowserInfo => {
  const ua = navigator.userAgent;
  let browserName = '';
  let browserVersion = '';
  let osName = '';
  let deviceType = 'desktop';
  
  // Detect browser
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('MSIE ') || ua.includes('Trident/')) {
    browserName = 'Internet Explorer';
    browserVersion = ua.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || '';
  } else {
    browserName = 'Unknown';
    browserVersion = '';
  }
  
  // Detect OS
  if (ua.includes('Windows')) {
    osName = 'Windows';
    if (ua.includes('Windows NT 10.0')) osName = 'Windows 10';
    else if (ua.includes('Windows NT 6.3')) osName = 'Windows 8.1';
    else if (ua.includes('Windows NT 6.2')) osName = 'Windows 8';
    else if (ua.includes('Windows NT 6.1')) osName = 'Windows 7';
  } else if (ua.includes('Mac OS X')) {
    osName = 'macOS';
    const versionMatch = ua.match(/Mac OS X ([0-9_]+)/);
    if (versionMatch) {
      const versionStr = versionMatch[1].replace(/_/g, '.');
      osName = `macOS ${versionStr}`;
    }
  } else if (ua.includes('Android')) {
    osName = 'Android';
    const versionMatch = ua.match(/Android ([\d.]+)/);
    if (versionMatch) {
      osName = `Android ${versionMatch[1]}`;
    }
    deviceType = ua.includes('Mobile') ? 'mobile' : 'tablet';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    osName = 'iOS';
    const versionMatch = ua.match(/OS ([\d_]+)/);
    if (versionMatch) {
      const versionStr = versionMatch[1].replace(/_/g, '.');
      osName = `iOS ${versionStr}`;
    }
    deviceType = ua.includes('iPad') ? 'tablet' : 'mobile';
  } else if (ua.includes('Linux')) {
    osName = 'Linux';
  } else {
    osName = 'Unknown';
  }
  
  // Detect device type if not already set
  if (deviceType === 'desktop') {
    if (/Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua)) {
      deviceType = /iPad|tablet/i.test(ua) ? 'tablet' : 'mobile';
    }
  }
  
  return {
    name: browserName,
    version: browserVersion,
    os: osName,
    deviceType
  };
};

/**
 * Attempts to detect if the browser is in incognito/private mode
 */
export const detectIncognito = async (): Promise<boolean> => {
  // Different detection methods for different browsers
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { quota } = await navigator.storage.estimate();
    // Chrome's quota is smaller in incognito
    return quota !== undefined && quota < 120000000;
  }
  
  try {
    // Safari and older browsers
    const tempStorage = window.localStorage;
    const testKey = 'fraudshield_incognito_test';
    tempStorage.setItem(testKey, '1');
    tempStorage.removeItem(testKey);
    return false;
  } catch (e) {
    // If localStorage is disabled, likely in private mode
    return true;
  }
}; 