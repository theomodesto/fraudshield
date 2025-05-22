# FraudShield Fingerprinting

## Overview

The FraudShield Fingerprinting system creates unique device identifiers without relying on cookies or persistent storage, allowing for persistent identification of devices across sessions and providing a powerful tool for fraud detection.

## How It Works

The fingerprinting client collects multiple signals from the user's browser to generate a unique identifier:

1. **Canvas Fingerprinting**: Renders graphics that vary based on hardware/software
2. **WebGL Fingerprinting**: Collects information about the device's graphics capabilities
3. **Audio Fingerprinting**: Analyzes subtle differences in audio processing
4. **Font Detection**: Identifies available fonts on the user's system
5. **Browser and OS Detection**: Analyzes user agent and platform information
6. **Hardware Information**: CPU cores, device memory, screen resolution, etc.
7. **Incognito Mode Detection**: Determines if the user is browsing in private mode

## Implementation Details

### FingerprintClient Class

The main class responsible for device fingerprinting is `FingerprintClient` in the SDK package. It provides methods for collecting and generating fingerprint data.

```typescript
// Basic usage example
const options: FingerprintOptions = {
  debug: false,
  cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
  cachingEnabled: true,
  failsafeTimeout: 2000, // 2 seconds timeout for signal collection
  cacheExpirationCheck: true,
  enabledSignals: {
    canvas: true,
    webgl: true,
    audio: true,
    fonts: true,
    incognito: true
  }
};

const client = new FingerprintClient(options);
const fingerprint = await client.collectData();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | boolean | `false` | Enable debug logging |
| `cacheExpiration` | number | `86400000` (24h) | Time in ms until fingerprint cache expires |
| `cachingEnabled` | boolean | `true` | Enable/disable fingerprint caching |
| `cacheExpirationCheck` | boolean | `false` | Check cached data expiration based on collection timestamp |
| `failsafeTimeout` | number | `2000` | Timeout in ms for signal collection to prevent hanging |
| `enabledSignals.canvas` | boolean | `true` | Enable canvas fingerprinting |
| `enabledSignals.webgl` | boolean | `true` | Enable WebGL fingerprinting |
| `enabledSignals.audio` | boolean | `true` | Enable audio fingerprinting |
| `enabledSignals.fonts` | boolean | `true` | Enable font detection |
| `enabledSignals.incognito` | boolean | `true` | Enable incognito mode detection |

## Privacy and Compliance

The fingerprinting system is designed with privacy in mind:

- No personal information is collected
- Fingerprints are stored as hashes, not raw data
- Compliant with major privacy regulations (when used responsibly)
- Can be configured to disable specific signals based on privacy requirements
- Allows disabling caching completely for strict privacy policies

## Performance Considerations

The fingerprinting process is optimized for performance:

- Runs asynchronously to avoid blocking the main thread
- Uses timeouts to prevent signal collection from hanging
- Implements parallel collection with failure isolation
- Caches results to prevent redundant processing
- Implements progressive enhancement to work on different browsers
- Typical collection time is under 100ms on modern devices

## Reliability Features

The library includes several features to ensure reliable fingerprinting:

- **Signal Timeouts**: Each signal collection has an individual timeout
- **Graceful Degradation**: If some signals fail to collect, others will still work
- **Confidence Scoring**: Provides a quantitative measure of fingerprint quality
- **Fallback Mechanisms**: Multiple layers of fallbacks if fingerprinting fails
- **Cache Validation**: Validates cached data before using it

## Integration with FraudShield SDK

The fingerprinting client is automatically initialized when using the FraudShield SDK:

```javascript
// Initialize FraudShield with fingerprinting options
FraudShield.init({
  merchantId: 'YOUR_MERCHANT_ID',
  fingerprintOptions: {
    debug: true,
    cachingEnabled: true,
    failsafeTimeout: 3000, // Increase timeout for slower devices
    enabledSignals: {
      canvas: true,
      webgl: true,
      audio: false, // Disable audio fingerprinting if desired
      fonts: true,
      incognito: true
    }
  }
});

// Access fingerprint data directly if needed
const deviceData = await FraudShield.getInstance().getDeviceFingerprint();
```

## Accuracy and Stability

The generated fingerprints are designed to be:

- **Stable**: The same device should generate the same or similar fingerprint across sessions
- **Unique**: Different devices should generate different fingerprints
- **Resilient**: Resistant to common anti-fingerprinting techniques

The system uses multiple signals to ensure that even if some components are blocked or modified, the overall fingerprint can still identify the device with reasonable accuracy. 

## Advanced Features

### Confidence Score

Each fingerprint includes a confidence score (0-1) indicating how reliable the identification is:

- **0.9-1.0**: Excellent - All signals collected successfully
- **0.7-0.9**: Good - Most signals collected
- **0.5-0.7**: Fair - Some signals missing
- **0.3-0.5**: Poor - Basic fingerprinting only
- **< 0.3**: Very poor - Fallback identification only

### Weighted Signal Importance

Not all signals contribute equally to the fingerprint quality. The system assigns higher importance to more distinctive signals like Canvas and Audio fingerprints. 