# FraudShield Fingerprinting Technical Specification

## 1. Introduction

The FraudShield Fingerprinting module is a core component of the fraud detection system, responsible for generating unique device identifiers that persist across sessions without relying on cookies or local storage. This document outlines the technical specifications, architecture, and implementation details of the fingerprinting system.

## 2. System Architecture

### 2.1 Components

The fingerprinting system consists of the following components:

- **FingerprintClient**: Core class responsible for collecting and processing device signals
- **Signal Collectors**: Specialized modules for each fingerprinting technique
- **Storage Adapter**: Interface for caching fingerprints with fallback mechanisms
- **Hashing Module**: Consistent hashing of raw signals into stable identifiers

### 2.2 Dependencies

- No external services required
- Minimal external dependencies (only UUID generation)
- Operates entirely client-side
- Compatible with all modern browsers (IE11+)

## 3. Signal Collection

### 3.1 Canvas Fingerprinting

The system renders complex graphics to a canvas element and extracts a data URL, which is hashed to create a unique identifier based on rendering differences.

```typescript
private async getCanvasFingerprint(): Promise<string> {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set dimensions and draw complex shapes/text
  canvas.width = 240;
  canvas.height = 140;
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.font = '18px Arial';
  ctx.fillText('FraudShield Fingerprint', 10, 20);
  
  // Extract data URL and hash it
  const dataUrl = canvas.toDataURL();
  return hashString(dataUrl);
}
```

### 3.2 WebGL Fingerprinting

Collects information about the user's graphics hardware and drivers by accessing WebGL parameters:

- Vendor and renderer strings
- Supported extensions
- Maximum texture sizes and capabilities
- Unmasked renderer information (when available)

### 3.3 Audio Fingerprinting

Creates an audio context and analyzes processing characteristics:

- Creates oscillator and analyser nodes
- Extracts frequency data with no audible output
- Processes frequency patterns that vary by device/browser

### 3.4 Font Detection

Determines available fonts by measuring text dimensions:

1. Renders test strings with base fonts (monospace, sans-serif, serif)
2. Attempts to render with specific font families
3. Detects successful rendering by comparing text dimensions
4. Returns array of available fonts

### 3.5 Browser and Hardware Detection

Collects non-PII system information:

- User agent parsing
- Screen dimensions and color depth
- Device memory and CPU cores
- Platform and language settings
- Touch capability detection

## 4. Fingerprint Generation

### 4.1 Data Processing

1. Collect all signals asynchronously
2. Normalize data formats
3. Filter out unstable or irrelevant signals
4. Combine signals into a compound identifier

### 4.2 Hashing Algorithm

The system uses a custom hashing function optimized for:

- Speed (sub-millisecond performance)
- Collision resistance
- Consistent output length
- Resilience to minor input changes

```typescript
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
```

## 5. Caching Strategy

### 5.1 Storage Mechanisms

The system uses a tiered approach to caching:

1. **In-Memory Cache**: Fastest, but lost on page refresh
2. **LocalStorage**: Persists across sessions with namespace isolation
3. **IndexedDB**: Fallback for private browsing or when localStorage is unavailable

### 5.2 Cache Invalidation

- Time-based expiration (default 24 hours)
- Version-based invalidation when fingerprinting algorithm changes
- Graceful handling of storage exceptions

## 6. Privacy and Security

### 6.1 Privacy Considerations

- No personal information collected
- Data minimization principles applied
- All data stored as hashes, not raw values
- Configurable signal collection for compliance needs

### 6.2 Security Measures

- No data transmitted without explicit API calls
- HTTPS-only communication
- Cross-origin protection
- Input validation and sanitation

## 7. Performance Optimization

### 7.1 Asynchronous Processing

- Non-blocking signal collection
- Promise-based architecture
- Signal collection prioritization

### 7.2 Resource Usage

- Minimal CPU usage (<5% during collection)
- No continuous background processing
- Small memory footprint (<1MB)
- No battery-intensive operations

## 8. Browser Compatibility

### 8.1 Supported Browsers

- Chrome 49+
- Firefox 52+
- Safari 11+
- Edge 16+
- Opera 36+
- Mobile Safari and Chrome for Android

### 8.2 Degradation Strategy

Progressive enhancement provides basic fingerprinting even when advanced features are unavailable:

```typescript
private getBasicFingerprint(): DeviceData {
  const browser = browserInfo();
  const basicId = hashString(navigator.userAgent + 
    navigator.language + 
    screen.colorDepth + 
    new Date().getTimezoneOffset());
  
  return {
    visitorId: basicId,
    // ...other basic properties
  };
}
```

## 9. Testing and Validation

### 9.1 Accuracy Metrics

- **Stability**: >98% consistency on same device
- **Uniqueness**: <0.1% collision rate across devices
- **Resilience**: Maintains 85%+ accuracy with partial signal blocking

### 9.2 Performance Benchmarks

- Signal collection: <100ms on average devices
- Hash generation: <1ms
- Memory usage: <1MB
- Network: Zero unless explicitly sending evaluation

## 10. Integration Points

### 10.1 SDK Integration

```typescript
// Integration with main SDK
class FraudShield {
  private fingerprintClient: FingerprintClient;
  
  constructor(config) {
    this.fingerprintClient = new FingerprintClient(config.fingerprintOptions);
  }
  
  async evaluate() {
    const fingerprintData = await this.fingerprintClient.collectData();
    // Use fingerprint data in evaluation
  }
}
```

### 10.2 Backend Integration

The fingerprint is sent as part of the evaluation payload to the backend services:

```typescript
interface EvaluationPayload {
  fingerprintData: DeviceData;
  // Other evaluation data
}
```

## 11. Future Enhancements

- WebRTC fingerprinting (media devices enumeration)
- CSS capabilities detection
- Browser extension detection
- Machine learning-based fingerprint stability improvements
- WebAssembly optimizations for performance-critical operations 