# FraudShield SDK Integration Guide

This guide provides instructions for integrating the FraudShield SDK into your website or application.

## Installation

### Using a Script Tag

The simplest way to integrate FraudShield is by adding a script tag to your HTML:

```html
<script 
  src="https://cdn.fraudshield.io/sdk/v1.min.js" 
  data-merchant-id="YOUR_MERCHANT_ID"
  data-api-endpoint="https://api.fraudshield.io/v1"
  data-enable-captcha="true"
></script>
```

### Using npm

If you're using a modern JavaScript framework, you can install the SDK using npm:

```bash
yarn install @fraudshield/sdk
```

Then import and initialize it in your code:

```javascript
import { FraudShield } from '@fraudshield/sdk';

FraudShield.init({
  merchantId: 'YOUR_MERCHANT_ID',
  apiEndpoint: 'https://api.fraudshield.io/v1'
});
```

## Basic Usage

### Auto-Evaluation (Recommended)

The SDK can automatically evaluate fraud risk when users perform certain actions:

```javascript
FraudShield.init({
  merchantId: 'YOUR_MERCHANT_ID',
  autoEvaluate: true,
  checkoutButtonSelector: '.checkout-button',
  checkoutFormSelector: 'form#checkout-form',
  onEvaluation: result => {
    console.log('Risk score:', result.riskScore);
    if (result.isFraud) {
      // Handle potential fraud
    }
  }
});
```

### Manual Evaluation

You can also manually trigger evaluations at specific points in your application:

```javascript
// Get FraudShield instance
const fs = FraudShield.getInstance();

// Evaluate at any time
document.getElementById('checkout-button').addEventListener('click', async () => {
  const result = await fs.evaluate({
    userAction: 'checkout',
    pageData: {
      cartTotal: 99.99,
      items: 3,
      currency: 'USD'
    }
  });
  
  if (result.requiresCaptcha) {
    // Show captcha to user
  } else if (result.isFraud) {
    // Handle potential fraud
  }
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `merchantId` | string | *Required* | Your FraudShield merchant ID |
| `apiEndpoint` | string | `'https://api.fraudshield.io/v1'` | API endpoint URL |
| `enableCaptcha` | boolean | `true` | Enable CAPTCHA for suspicious activities |
| `captchaThreshold` | number | `0.8` | Risk score threshold to trigger CAPTCHA |
| `debug` | boolean | `false` | Enable debug logging |
| `autoEvaluate` | boolean | `true` | Automatically evaluate on user actions |
| `checkoutButtonSelector` | string | `null` | CSS selector for checkout buttons |
| `checkoutFormSelector` | string | `null` | CSS selector for checkout forms |
| `fingerprintOptions` | object | `{}` | Options for the fingerprinting module |
| `onEvaluation` | function | `null` | Callback function for evaluation results |

## Advanced Usage

### Getting Device Fingerprint Data

If you need direct access to the device fingerprint data:

```javascript
const fingerprintData = await FraudShield.getInstance().getDeviceFingerprint();
console.log('Visitor ID:', fingerprintData.visitorId);
```

### Custom Page Data

You can include additional page data in your evaluations to improve fraud detection:

```javascript
await fs.evaluate({
  userAction: 'account_creation',
  pageData: {
    url: window.location.href,
    referrer: document.referrer,
    userEmail: 'user@example.com',
    accountAge: 0,
    hasCompletedProfile: false
  }
});
```

### Error Handling

The SDK is designed to fail gracefully if network errors or other issues occur:

```javascript
try {
  const result = await fs.evaluate();
  // Handle successful evaluation
} catch (error) {
  console.error('FraudShield evaluation failed:', error);
  // Proceed with default behavior
}
```

## Privacy Compliance

The FraudShield SDK is designed to be compliant with major privacy regulations when used properly. However, you should:

1. Include information about the use of fraud detection in your privacy policy
2. Consider limiting data collection in regions with strict privacy laws
3. Be aware of local regulations regarding device fingerprinting

## Testing

### Test Mode

You can enable test mode to avoid affecting your production fraud metrics:

```javascript
FraudShield.init({
  merchantId: 'YOUR_MERCHANT_ID',
  apiEndpoint: 'https://api.fraudshield.io/v1',
  debug: true,
  testMode: true
});
```

### Simulating Fraud Signals

During development and testing, you can simulate specific fraud signals:

```javascript
// Simulate a high-risk user (only works in test environments)
FraudShield.init({
  merchantId: 'YOUR_TEST_MERCHANT_ID',
  testMode: true,
  simulateRiskScore: 0.95,
  simulateFraud: true
});
```

## Migration from FingerprintJS Pro

If you're migrating from FingerprintJS Pro, here's a quick comparison:

```javascript
// FingerprintJS Pro
const fpPromise = import('@fingerprintjs/fingerprintjs-pro')
  .then(FingerprintJS => FingerprintJS.load({ apiKey: 'your-api-key' }));

fpPromise
  .then(fp => fp.get())
  .then(result => console.log(result.visitorId));

// FraudShield equivalent
FraudShield.init({ merchantId: 'YOUR_MERCHANT_ID' });

FraudShield.getInstance()
  .getDeviceFingerprint()
  .then(result => console.log(result.visitorId));
```

## Troubleshooting

### SDK Not Loading

Ensure you're using the correct CDN URL or package version. If the script is blocked by ad blockers, consider serving it from your own domain.

### High Latency

If you experience slow response times:

1. Make sure you're using the geographically closest API endpoint
2. Enable fingerprint caching by setting appropriate `cacheExpiration`
3. Consider reducing the number of enabled fingerprinting signals

### Support

If you encounter issues not covered here, please contact support at support@fraudshield.io or check the [developer documentation](https://docs.fraudshield.io). 