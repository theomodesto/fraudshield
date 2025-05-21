# FraudShield

FraudShield is a fraud detection platform designed to help e-commerce merchants identify and prevent fraudulent transactions in real-time.

## Monorepo Structure

This project uses Turborepo for managing a monorepo with the following packages and applications:

### Packages

- `@fraudshield/fingerprint`: Device fingerprinting module that collects browser/device signals
- `@fraudshield/sdk`: JavaScript SDK for integrating FraudShield into merchant websites 
- `@fraudshield/tsconfig`: Shared TypeScript configurations
- `@fraudshield/eslint-config`: Shared ESLint configurations

### Applications

- `@fraudshield/evaluator`: Service that processes events from the SDK and evaluates fraud risk
- `@fraudshield/decisioner`: Service that makes final decisions on transactions (coming soon)
- `@fraudshield/dashboard`: Merchant dashboard for analytics and configuration (coming soon)

## Getting Started

### Prerequisites

- Node.js (v22 or later)
- npm (v10 or later)
- Docker and Docker Compose (for local development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/fraudshield.git
cd fraudshield
```

2. Install dependencies:

```bash
npm install
```

3. Build all packages:

```bash
npm run build
```

### Development

To start the development environment:

```bash
npm run dev
```

This will start all services in development mode with hot reloading.

### Testing

To run tests across all packages:

```bash
npm test
```

## Services

### Evaluator Service

The Evaluator service is responsible for:
- Processing incoming events from the SDK
- Enriching events with GeoIP data and velocity metrics
- Calculating risk scores based on fraud detection algorithms
- Publishing risk scores to Kafka for further processing

Configuration is done through environment variables defined in `.env` files.

### SDK

The JavaScript SDK provides:
- Device fingerprinting
- Integration with e-commerce platforms
- Real-time risk evaluation
- CAPTCHA challenge support for suspicious transactions

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
# fraudshield
